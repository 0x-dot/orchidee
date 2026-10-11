package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

const (
	maxUpload   = 8 << 20 // 8 MB per richiesta
	maxPhotoPx  = 1600    // lato lungo massimo salvato
	maxSourcePx = 12000   // oltre questo rifiutiamo (protezione da "decompression bomb")
)

var validKinds = map[string]bool{
	"nota": true, "radice": true, "foglia": true, "germoglio": true,
	"fioritura": true, "rinvaso": true, "trattamento": true,
}

// apiErr è un errore con un codice stabile che il frontend traduce.
type apiErr string

func (e apiErr) Error() string { return string(e) }

type Entry struct {
	ID       int64  `json:"id"`
	PlantID  int64  `json:"plantId"`
	Date     string `json:"date"`
	Kind     string `json:"kind"`
	Note     string `json:"note"`
	HasPhoto bool   `json:"hasPhoto"`
}

func (s *Server) photoDir() string { return filepath.Join(s.dataDir, "photos") }

// savePhoto decodifica, ridimensiona e ricodifica in JPEG. Ricodificare elimina anche i metadati EXIF (GPS compreso).
func (s *Server) savePhoto(f multipart.File) (string, error) {
	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return "", apiErr("photo_format")
	}
	if cfg.Width > maxSourcePx || cfg.Height > maxSourcePx {
		return "", apiErr("photo_too_large")
	}
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	img, _, err := image.Decode(f)
	if err != nil {
		return "", apiErr("photo_invalid")
	}

	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w > maxPhotoPx || h > maxPhotoPx {
		if w >= h {
			h, w = h*maxPhotoPx/w, maxPhotoPx
		} else {
			w, h = w*maxPhotoPx/h, maxPhotoPx
		}
	}
	if w < 1 {
		w = 1
	}
	if h < 1 {
		h = 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(dst, dst.Bounds(), image.White, image.Point{}, draw.Src) // sfondo bianco per PNG trasparenti
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, b, draw.Over, nil)

	if err := os.MkdirAll(s.photoDir(), 0o755); err != nil {
		return "", err
	}
	rnd := make([]byte, 16)
	if _, err := rand.Read(rnd); err != nil {
		return "", err
	}
	name := hex.EncodeToString(rnd) + ".jpg"
	out, err := os.Create(filepath.Join(s.photoDir(), name))
	if err != nil {
		return "", err
	}
	defer out.Close()
	if err := jpeg.Encode(out, dst, &jpeg.Options{Quality: 82}); err != nil {
		os.Remove(out.Name())
		return "", err
	}
	return name, nil
}

func (s *Server) removePhotos(names ...string) {
	for _, n := range names {
		if n != "" && !strings.ContainsAny(n, `/\`) {
			_ = os.Remove(filepath.Join(s.photoDir(), n))
		}
	}
}

// ---------- handler ----------

func (s *Server) handleListTimeline(w http.ResponseWriter, r *http.Request, u *User) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "invalid_id")
		return
	}
	p, err := s.getPlant(id)
	if err != nil || (!p.Public && (u == nil || u.ID != p.UserID)) {
		writeErr(w, 404, "not_found")
		return
	}
	rows, err := s.db.Query(`SELECT id, plant_id, entry_date, kind, note, photo_path != ''
		FROM timeline_entries WHERE plant_id = ? ORDER BY entry_date DESC, id DESC`, id)
	if err != nil {
		writeErr(w, 500, "internal")
		return
	}
	defer rows.Close()
	out := []Entry{}
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.ID, &e.PlantID, &e.Date, &e.Kind, &e.Note, &e.HasPhoto); err != nil {
			writeErr(w, 500, "internal")
			return
		}
		out = append(out, e)
	}
	writeJSON(w, 200, out)
}

func (s *Server) handleAddEntry(w http.ResponseWriter, r *http.Request, u *User) {
	p, ok := s.ownedPlant(w, r, u)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload)
	if err := r.ParseMultipartForm(maxUpload); err != nil {
		writeErr(w, 400, "upload_too_big")
		return
	}
	date := r.FormValue("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	if _, err := time.Parse("2006-01-02", date); err != nil {
		writeErr(w, 400, "invalid_date")
		return
	}
	kind := r.FormValue("kind")
	if kind == "" {
		kind = "nota"
	}
	if !validKinds[kind] {
		writeErr(w, 400, "invalid_kind")
		return
	}
	note := strings.TrimSpace(r.FormValue("note"))
	if len(note) > 2000 {
		writeErr(w, 400, "text_too_long")
		return
	}

	photo := ""
	if f, _, err := r.FormFile("photo"); err == nil {
		defer f.Close()
		if photo, err = s.savePhoto(f); err != nil {
			var ae apiErr
			if errors.As(err, &ae) {
				writeErr(w, 400, string(ae))
			} else {
				writeErr(w, 500, "internal")
			}
			return
		}
	}
	if note == "" && photo == "" {
		writeErr(w, 400, "empty_entry")
		return
	}

	res, err := s.db.Exec(`INSERT INTO timeline_entries(plant_id,entry_date,kind,note,photo_path) VALUES(?,?,?,?,?)`,
		p.ID, date, kind, note, photo)
	if err != nil {
		s.removePhotos(photo)
		writeErr(w, 500, "internal")
		return
	}
	id, _ := res.LastInsertId()
	writeJSON(w, 201, Entry{ID: id, PlantID: p.ID, Date: date, Kind: kind, Note: note, HasPhoto: photo != ""})
}

// entryAccess carica una voce con il proprietario e la visibilità della pianta.
func (s *Server) entryAccess(id int64) (photo string, ownerID int64, public bool, err error) {
	var pub int
	err = s.db.QueryRow(`SELECT e.photo_path, p.user_id, p.public FROM timeline_entries e
		JOIN plants p ON p.id = e.plant_id WHERE e.id = ?`, id).Scan(&photo, &ownerID, &pub)
	return photo, ownerID, pub == 1, err
}

func (s *Server) handleDeleteEntry(w http.ResponseWriter, r *http.Request, u *User) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "invalid_id")
		return
	}
	photo, ownerID, _, err := s.entryAccess(id)
	if err != nil || ownerID != u.ID {
		writeErr(w, 404, "not_found")
		return
	}
	if _, err := s.db.Exec(`DELETE FROM timeline_entries WHERE id = ?`, id); err != nil {
		writeErr(w, 500, "internal")
		return
	}
	s.removePhotos(photo)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handlePhoto(w http.ResponseWriter, r *http.Request, u *User) {
	id, ok := pathID(r)
	if !ok {
		http.NotFound(w, r)
		return
	}
	photo, ownerID, public, err := s.entryAccess(id)
	if err == sql.ErrNoRows || err != nil || photo == "" || (!public && (u == nil || u.ID != ownerID)) {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "private, max-age=86400")
	http.ServeFile(w, r, filepath.Join(s.photoDir(), photo))
}
