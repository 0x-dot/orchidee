package main

import (
	"database/sql"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
)

//go:embed all:web/dist/browser
var webFS embed.FS

type Server struct {
	db      *sql.DB
	dataDir string
	secure  bool // cookie Secure (true in produzione dietro HTTPS)
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	dataDir := env("DATA_DIR", "./data")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		log.Fatal(err)
	}
	db, err := openDB(path.Join(dataDir, "garden.db"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	s := &Server{db: db, dataDir: dataDir, secure: env("COOKIE_SECURE", "") == "1"}

	mux := http.NewServeMux()
	s.routes(mux)
	mux.Handle("/", spaHandler())

	addr := env("ADDR", ":8080")
	log.Println("in ascolto su", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func (s *Server) routes(mux *http.ServeMux) {
	// auth
	mux.HandleFunc("POST /api/register", s.handleRegister)
	mux.HandleFunc("POST /api/login", s.handleLogin)
	mux.HandleFunc("POST /api/logout", s.handleLogout)
	mux.HandleFunc("GET /api/me", s.auth(s.handleMe))

	// piante e schede
	mux.HandleFunc("GET /api/plants", s.auth(s.handleListMine))
	mux.HandleFunc("POST /api/plants", s.auth(s.handleCreatePlant))
	mux.HandleFunc("GET /api/plants/{id}", s.optAuth(s.handleGetPlant))
	mux.HandleFunc("PUT /api/plants/{id}", s.auth(s.handleUpdatePlant))
	mux.HandleFunc("DELETE /api/plants/{id}", s.auth(s.handleDeletePlant))
	mux.HandleFunc("POST /api/plants/{id}/copy", s.auth(s.handleCopyPlant))

	mux.HandleFunc("POST /api/seed", s.auth(s.handleSeed))

	// timeline di crescita
	mux.HandleFunc("GET /api/plants/{id}/timeline", s.optAuth(s.handleListTimeline))
	mux.HandleFunc("POST /api/plants/{id}/timeline", s.auth(s.handleAddEntry))
	mux.HandleFunc("DELETE /api/timeline/{id}", s.auth(s.handleDeleteEntry))
	mux.HandleFunc("GET /api/timeline/{id}/photo", s.optAuth(s.handlePhoto))

	// esplora giardini altrui
	mux.HandleFunc("GET /api/explore", s.handleExplore)
}

// spaHandler serve i file Angular; per le rotte client-side ricade su index.html.
func spaHandler() http.Handler {
	sub, err := fs.Sub(webFS, "web/dist/browser")
	if err != nil {
		log.Fatal(err)
	}
	files := http.FileServer(http.FS(sub))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if p == "" {
			p = "index.html"
		}
		if _, err := fs.Stat(sub, p); err != nil {
			r.URL.Path = "/" // fallback SPA
		}
		files.ServeHTTP(w, r)
	})
}
