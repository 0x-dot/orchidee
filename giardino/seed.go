package main

import "net/http"

// Tre schede di esempio (orchidee), in italiano e in inglese, da caricare con un pulsante.
var starterIT = []Plant{
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

var starterEN = []Plant{
	{BotanicalName: "Aerangis mystacidii", Nickname: "flowering potatoes", Sheet: Sheet{
		Origine:         "Madagascar and East Africa. Epiphyte in humid forests, on shaded branches.",
		Crescita:        "Monopodial, compact.",
		Luce:            "Medium (8,000–12,000 lux). Filtered light, avoid direct sun.",
		Temperatura:     "Day: 22–26 °C\nNight: 16–18 °C\nMinimum: 14 °C",
		Umidita:         "60–80%",
		Ventilazione:    "Constant but gentle.",
		Substrato:       "Mounted, or very fine bark in a small pot.",
		Annaffiatura:    "Summer: 2–3 times a week\nWinter: once a week",
		Fertilizzazione: "20-20-20 at 1/4 strength every 2nd watering.",
		Riposo:          "Light rest in winter.",
		Fioritura:       "Spring–summer, scented at night.",
		Note:            "Sensitive to waterlogging, loves moving air.",
	}},
	{BotanicalName: "Epidendrum polybulbon", Sheet: Sheet{
		Origine:         "Central and South America. Epiphyte in bright, airy places.",
		Crescita:        "Sympodial, clumping, vigorous growth.",
		Luce:            "Medium-high (15,000–25,000 lux). Tolerates a few hours of filtered sun.",
		Temperatura:     "Day: 20–28 °C\nNight: 14–18 °C",
		Umidita:         "50–70%",
		Ventilazione:    "Good, continuous air movement.",
		Substrato:       "Medium-coarse bark, or mounted. Dislikes very fine substrates.",
		Annaffiatura:    "Summer: frequent, keep slightly moist\nWinter: reduce, without drying out completely",
		Fertilizzazione: "Regular during growth, 1/2 strength every 2 weeks.",
		Riposo:          "No pronounced rest period.",
		Fioritura:       "Summer. Small but numerous flowers.",
		Note:            "Robust and adaptable, also ideal for growing outdoors in summer.",
	}},
	{BotanicalName: "Phalaenopsis Mini Mark", Sheet: Sheet{
		Origine:         "Phalaenopsis hybrid, derived from tropical Asian species.",
		Crescita:        "Monopodial, compact.",
		Luce:            "Low-medium (6,000–10,000 lux). No direct sun.",
		Temperatura:     "Day: 22–30 °C\nNight: 18–20 °C",
		Umidita:         "40–60%",
		Ventilazione:    "Light, avoid cold drafts.",
		Substrato:       "Fine bark, clear pot recommended.",
		Annaffiatura:    "Summer: every 5–7 days\nWinter: every 10–14 days",
		Fertilizzazione: "Balanced, 1/4 strength every 2 weeks.",
		Riposo:          "No real rest, but ease off slightly in winter.",
		Fioritura:       "Winter–spring. Scented, spotted flowers.",
		Note:            "Very forgiving, ideal for bright indoor spaces.",
	}},
}

// POST /api/seed?lang=it|en: aggiunge al giardino dell'utente le schede di esempio che non ha già.
func (s *Server) handleSeed(w http.ResponseWriter, r *http.Request, u *User) {
	starters := starterIT
	if r.URL.Query().Get("lang") == "en" {
		starters = starterEN
	}
	added := 0
	for i := range starters {
		p := starters[i]
		var n int
		if err := s.db.QueryRow(`SELECT COUNT(*) FROM plants WHERE user_id = ? AND botanical_name = ?`,
			u.ID, p.BotanicalName).Scan(&n); err != nil {
			writeErr(w, 500, "internal")
			return
		}
		if n > 0 {
			continue
		}
		if _, err := s.insertPlant(u.ID, &p, nil); err != nil {
			writeErr(w, 500, "internal")
			return
		}
		added++
	}
	writeJSON(w, 200, map[string]int{"added": added})
}
