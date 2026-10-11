package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type ctxKey string

const userKey ctxKey = "user"
const cookieName = "giardino_session"
const sessionDays = 30

type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
}

var usernameRe = regexp.MustCompile(`^[A-Za-z0-9_.-]{3,30}$`)

// ---------- helper JSON ----------

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func readJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return false
	}
	return true
}

// ---------- sessioni ----------

func hashToken(t string) string {
	h := sha256.Sum256([]byte(t))
	return hex.EncodeToString(h[:])
}

func (s *Server) startSession(w http.ResponseWriter, userID int64) error {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	token := hex.EncodeToString(b)
	exp := time.Now().Add(sessionDays * 24 * time.Hour)
	_, err := s.db.Exec(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)`,
		hashToken(token), userID, exp.UTC().Format(time.RFC3339))
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name: cookieName, Value: token, Path: "/", Expires: exp,
		HttpOnly: true, Secure: s.secure, SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func (s *Server) userFromRequest(r *http.Request) *User {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return nil
	}
	var u User
	var exp string
	err = s.db.QueryRow(`SELECT u.id, u.username, s.expires_at FROM sessions s
		JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`, hashToken(c.Value)).
		Scan(&u.ID, &u.Username, &exp)
	if err == sql.ErrNoRows || err != nil {
		return nil
	}
	if t, err := time.Parse(time.RFC3339, exp); err != nil || time.Now().After(t) {
		return nil
	}
	return &u
}

// auth: richiede login. optAuth: login facoltativo.
func (s *Server) auth(next func(http.ResponseWriter, *http.Request, *User)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := s.userFromRequest(r)
		if u == nil {
			writeErr(w, http.StatusUnauthorized, "unauthenticated")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), userKey, u)), u)
	}
}

func (s *Server) optAuth(next func(http.ResponseWriter, *http.Request, *User)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		next(w, r, s.userFromRequest(r)) // u può essere nil
	}
}

// ---------- handler ----------

type credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if !readJSON(w, r, &c) {
		return
	}
	c.Username = strings.TrimSpace(c.Username)
	if !usernameRe.MatchString(c.Username) {
		writeErr(w, 400, "username_format")
		return
	}
	if len(c.Password) < 8 || len(c.Password) > 72 { // 72 = limite bcrypt
		writeErr(w, 400, "password_length")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	if err != nil {
		writeErr(w, 500, "internal")
		return
	}
	res, err := s.db.Exec(`INSERT INTO users(username,password_hash) VALUES(?,?)`, c.Username, string(hash))
	if err != nil {
		writeErr(w, 409, "username_taken")
		return
	}
	id, _ := res.LastInsertId()
	if err := s.startSession(w, id); err != nil {
		writeErr(w, 500, "internal")
		return
	}
	writeJSON(w, 201, User{ID: id, Username: c.Username})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if !readJSON(w, r, &c) {
		return
	}
	var u User
	var hash string
	err := s.db.QueryRow(`SELECT id, username, password_hash FROM users WHERE username = ?`,
		strings.TrimSpace(c.Username)).Scan(&u.ID, &u.Username, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(c.Password)) != nil {
		writeErr(w, 401, "bad_credentials")
		return
	}
	if err := s.startSession(w, u.ID); err != nil {
		writeErr(w, 500, "internal")
		return
	}
	writeJSON(w, 200, u)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(cookieName); err == nil {
		_, _ = s.db.Exec(`DELETE FROM sessions WHERE token_hash = ?`, hashToken(c.Value))
	}
	http.SetCookie(w, &http.Cookie{Name: cookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true})
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request, u *User) {
	writeJSON(w, 200, u)
}
