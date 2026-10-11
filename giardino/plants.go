package main

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
)

type Sheet struct {
	Origine         string `json:"origine"`
	Crescita        string `json:"crescita"`
	Luce            string `json:"luce"`
	Temperatura     string `json:"temperatura"`
	Umidita         string `json:"umidita"`
	Ventilazione    string `json:"ventilazione"`
	Substrato       string `json:"substrato"`
	Annaffiatura    string `json:"annaffiatura"`
	Acqua           string `json:"acqua"`
	Fertilizzazione string `json:"fertilizzazione"`
	Riposo          string `json:"riposo"`
	Fioritura       string `json:"fioritura"`
	Note            string `json:"note"`
}

type Plant struct {
	ID            int64  `json:"id"`
	UserID        int64  `json:"userId"`
	Owner         string `json:"owner"`
	BotanicalName string `json:"botanicalName"`
	Nickname      string `json:"nickname"`
	AcquiredAt    string `json:"acquiredAt"`
	Public        bool   `json:"public"`
	Sheet         Sheet  `json:"sheet"`
}

const plantSelect = `
SELECT p.id, p.user_id, u.username, p.botanical_name, p.nickname, p.acquired_at, p.public,
  c.origine, c.crescita, c.luce, c.temperatura, c.umidita, c.ventilazione, c.substrato,
  c.annaffiatura, c.acqua, c.fertilizzazione, c.riposo, c.fioritura, c.note
FROM plants p
JOIN users u ON u.id = p.user_id
JOIN care_sheets c ON c.plant_id = p.id `

type scanner interface{ Scan(dest ...any) error }

func scanPlant(row scanner) (*Plant, error) {
	var p Plant
	var pub int
	s := &p.Sheet
	err := row.Scan(&p.ID, &p.UserID, &p.Owner, &p.BotanicalName, &p.Nickname, &p.AcquiredAt, &pub,
		&s.Origine, &s.Crescita, &s.Luce, &s.Temperatura, &s.Umidita, &s.Ventilazione, &s.Substrato,
		&s.Annaffiatura, &s.Acqua, &s.Fertilizzazione, &s.Riposo, &s.Fioritura, &s.Note)
	p.Public = pub == 1
	return &p, err
}

func (s *Server) listPlants(where string, args ...any) ([]*Plant, error) {
	rows, err := s.db.Query(plantSelect+where, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Plant{}
	for rows.Next() {
		p, err := scanPlant(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Server) getPlant(id int64) (*Plant, error) {
	return scanPlant(s.db.QueryRow(plantSelect+`WHERE p.id = ?`, id))
}

func pathID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil
}

// limiti anti-abuso sui testi
func clean(p *Plant) string {
	p.BotanicalName = strings.TrimSpace(p.BotanicalName)
	if p.BotanicalName == "" {
		return "il nome botanico è obbligatorio"
	}
	if len(p.BotanicalName) > 120 || len(p.Nickname) > 120 || len(p.AcquiredAt) > 10 {
		return "campo troppo lungo"
	}
	for _, f := range []*string{&p.Sheet.Origine, &p.Sheet.Crescita, &p.Sheet.Luce, &p.Sheet.Temperatura,
		&p.Sheet.Umidita, &p.Sheet.Ventilazione, &p.Sheet.Substrato, &p.Sheet.Annaffiatura, &p.Sheet.Acqua,
		&p.Sheet.Fertilizzazione, &p.Sheet.Riposo, &p.Sheet.Fioritura, &p.Sheet.Note} {
		if len(*f) > 2000 {
			return "testo troppo lungo (max 2000 caratteri per campo)"
		}
	}
	return ""
}

func b2i(b bool) int {
	if b {
		return 1
	}
	return 0
}

func (s *Server) insertPlant(userID int64, p *Plant, copiedFrom any) (int64, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	res, err := tx.Exec(`INSERT INTO plants(user_id,botanical_name,nickname,acquired_at,public,copied_from)
		VALUES(?,?,?,?,?,?)`, userID, p.BotanicalName, p.Nickname, p.AcquiredAt, b2i(p.Public), copiedFrom)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	c := p.Sheet
	_, err = tx.Exec(`INSERT INTO care_sheets(plant_id,origine,crescita,luce,temperatura,umidita,ventilazione,
		substrato,annaffiatura,acqua,fertilizzazione,riposo,fioritura,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		id, c.Origine, c.Crescita, c.Luce, c.Temperatura, c.Umidita, c.Ventilazione, c.Substrato,
		c.Annaffiatura, c.Acqua, c.Fertilizzazione, c.Riposo, c.Fioritura, c.Note)
	if err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

// ---------- handler ----------

func (s *Server) handleListMine(w http.ResponseWriter, r *http.Request, u *User) {
	ps, err := s.listPlants(`WHERE p.user_id = ? ORDER BY p.botanical_name`, u.ID)
	if err != nil {
		writeErr(w, 500, "errore interno")
		return
	}
	writeJSON(w, 200, ps)
}

func (s *Server) handleExplore(w http.ResponseWriter, r *http.Request) {
	ps, err := s.listPlants(`WHERE p.public = 1 ORDER BY p.id DESC LIMIT 100`)
	if err != nil {
		writeErr(w, 500, "errore interno")
		return
	}
	writeJSON(w, 200, ps)
}

func (s *Server) handleCreatePlant(w http.ResponseWriter, r *http.Request, u *User) {
	var p Plant
	if !readJSON(w, r, &p) {
		return
	}
	if msg := clean(&p); msg != "" {
		writeErr(w, 400, msg)
		return
	}
	id, err := s.insertPlant(u.ID, &p, nil)
	if err != nil {
		writeErr(w, 500, "errore interno")
		return
	}
	created, _ := s.getPlant(id)
	writeJSON(w, 201, created)
}

func (s *Server) handleGetPlant(w http.ResponseWriter, r *http.Request, u *User) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "id non valido")
		return
	}
	p, err := s.getPlant(id)
	if err == sql.ErrNoRows || (err == nil && !p.Public && (u == nil || u.ID != p.UserID)) {
		writeErr(w, 404, "scheda non trovata") // 404 anche per le private: non riveliamo che esistono
		return
	}
	if err != nil {
		writeErr(w, 500, "errore interno")
		return
	}
	writeJSON(w, 200, p)
}

func (s *Server) ownedPlant(w http.ResponseWriter, r *http.Request, u *User) (*Plant, bool) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "id non valido")
		return nil, false
	}
	p, err := s.getPlant(id)
	if err != nil || p.UserID != u.ID {
		writeErr(w, 404, "scheda non trovata")
		return nil, false
	}
	return p, true
}

func (s *Server) handleUpdatePlant(w http.ResponseWriter, r *http.Request, u *User) {
	cur, ok := s.ownedPlant(w, r, u)
	if !ok {
		return
	}
	var p Plant
	if !readJSON(w, r, &p) {
		return
	}
	if msg := clean(&p); msg != "" {
		writeErr(w, 400, msg)
		return
	}
	tx, err := s.db.Begin()
	if err != nil {
		writeErr(w, 500, "errore interno")
		return
	}
	defer tx.Rollback()
	c := p.Sheet
	_, err = tx.Exec(`UPDATE plants SET botanical_name=?, nickname=?, acquired_at=?, public=? WHERE id=?`,
		p.BotanicalName, p.Nickname, p.AcquiredAt, b2i(p.Public), cur.ID)
	if err == nil {
		_, err = tx.Exec(`UPDATE care_sheets SET origine=?,crescita=?,luce=?,temperatura=?,umidita=?,
			ventilazione=?,substrato=?,annaffiatura=?,acqua=?,fertilizzazione=?,riposo=?,fioritura=?,note=?
			WHERE plant_id=?`, c.Origine, c.Crescita, c.Luce, c.Temperatura, c.Umidita, c.Ventilazione,
			c.Substrato, c.Annaffiatura, c.Acqua, c.Fertilizzazione, c.Riposo, c.Fioritura, c.Note, cur.ID)
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		writeErr(w, 500, "errore interno")
		return
	}
	updated, _ := s.getPlant(cur.ID)
	writeJSON(w, 200, updated)
}

func (s *Server) handleDeletePlant(w http.ResponseWriter, r *http.Request, u *User) {
	cur, ok := s.ownedPlant(w, r, u)
	if !ok {
		return
	}
	// raccogli le foto prima: la cancellazione a cascata elimina le righe, non i file
	var photos []string
	if rows, err := s.db.Query(`SELECT photo_path FROM timeline_entries WHERE plant_id = ? AND photo_path != ''`, cur.ID); err == nil {
		for rows.Next() {
			var ph string
			if rows.Scan(&ph) == nil {
				photos = append(photos, ph)
			}
		}
		rows.Close()
	}
	if _, err := s.db.Exec(`DELETE FROM plants WHERE id = ?`, cur.ID); err != nil {
		writeErr(w, 500, "errore interno")
		return
	}
	s.removePhotos(photos...)
	w.WriteHeader(http.StatusNoContent)
}

// Copia una scheda pubblica nel proprio giardino: nome personale e timeline restano vuoti.
func (s *Server) handleCopyPlant(w http.ResponseWriter, r *http.Request, u *User) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "id non valido")
		return
	}
	src, err := s.getPlant(id)
	if err != nil || (!src.Public && src.UserID != u.ID) {
		writeErr(w, 404, "scheda non trovata")
		return
	}
	cp := *src
	cp.Nickname, cp.AcquiredAt, cp.Public = "", "", false
	newID, err := s.insertPlant(u.ID, &cp, src.ID)
	if err != nil {
		writeErr(w, 500, "errore interno")
		return
	}
	created, _ := s.getPlant(newID)
	writeJSON(w, 201, created)
}
