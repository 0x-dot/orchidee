package main

import "net/http"

// Le tre schede originali (aerangis, epidendrum, phalaenopsis), da caricare con un pulsante.
var starterPlants = []Plant{
	{BotanicalName: "Aerangis mystacidii", Nickname: "patate fiorite", Sheet: Sheet{
		Origine:         "Madagascar e Africa orientale. Epifita in foreste umide, su rami ombreggiati.",
		Crescita:        "Monopodiale, compatta.",
		Luce:            "Media (8.000–12.000 lux). Luce filtrata, evitare sole diretto.",
		Temperatura:     "Giorno: 22–26 °C\nNotte: 16–18 °C\nMinimo: 14 °C",
		Umidita:         "60–80%",
		Ventilazione:    "Costante ma delicata.",
		Substrato:       "Montata o bark molto fine in vaso piccolo.",
		Annaffiatura:    "Estate: 2–3 volte a settimana\nInverno: 1 volta a settimana",
		Fertilizzazione: "20-20-20 a 1/4 dose ogni 2 annaffiature.",
		Riposo:          "Leggero in inverno.",
		Fioritura:       "Primavera–estate, profumata di notte.",
		Note:            "Sensibile ai ristagni, ama aria in movimento.",
	}},
	{BotanicalName: "Epidendrum polybulbon", Sheet: Sheet{
		Origine:         "America Centrale e Meridionale. Epifita in zone luminose e ventilate.",
		Crescita:        "Simpodiale, cespitosa, crescita vigorosa.",
		Luce:            "Medio-alta (15.000–25.000 lux). Tollera alcune ore di sole filtrato.",
		Temperatura:     "Giorno: 20–28 °C\nNotte: 14–18 °C",
		Umidita:         "50–70%",
		Ventilazione:    "Buona ventilazione continua.",
		Substrato:       "Bark medio-grosso o montata. Non ama substrati troppo fini.",
		Annaffiatura:    "Estate: frequente, mantenere leggermente umido\nInverno: ridurre, senza seccare completamente",
		Fertilizzazione: "Regolare durante la crescita, 1/2 dose ogni 2 settimane.",
		Riposo:          "Nessun vero riposo marcato.",
		Fioritura:       "Estate. Fiori piccoli ma numerosi.",
		Note:            "Specie robusta e adattabile, ideale anche per coltivazione all'esterno in estate.",
	}},
	{BotanicalName: "Phalaenopsis Mini Mark", Sheet: Sheet{
		Origine:         "Ibrido di Phalaenopsis, derivato da specie tropicali asiatiche.",
		Crescita:        "Monopodiale, compatta.",
		Luce:            "Bassa-media (6.000–10.000 lux). No sole diretto.",
		Temperatura:     "Giorno: 22–30 °C\nNotte: 18–20 °C",
		Umidita:         "40–60%",
		Ventilazione:    "Leggera, evitare correnti fredde.",
		Substrato:       "Bark fine, vaso trasparente consigliato.",
		Annaffiatura:    "Estate: ogni 5–7 giorni\nInverno: ogni 10–14 giorni",
		Fertilizzazione: "Bilanciata, 1/4 dose ogni 2 settimane.",
		Riposo:          "Nessun vero riposo, ma lieve riduzione in inverno.",
		Fioritura:       "Inverno–primavera. Fiori profumati, maculati.",
		Note:            "Molto tollerante, ideale per interni ben illuminati.",
	}},
}

// POST /api/seed: aggiunge al giardino dell'utente le schede iniziali che non ha già.
func (s *Server) handleSeed(w http.ResponseWriter, r *http.Request, u *User) {
	added := 0
	for i := range starterPlants {
		p := starterPlants[i]
		var n int
		if err := s.db.QueryRow(`SELECT COUNT(*) FROM plants WHERE user_id = ? AND botanical_name = ?`,
			u.ID, p.BotanicalName).Scan(&n); err != nil {
			writeErr(w, 500, "errore interno")
			return
		}
		if n > 0 {
			continue
		}
		if _, err := s.insertPlant(u.ID, &p, nil); err != nil {
			writeErr(w, 500, "errore interno")
			return
		}
		added++
	}
	writeJSON(w, 200, map[string]int{"added": added})
}
