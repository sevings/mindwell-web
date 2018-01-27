package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/flosch/pongo2"
)

func main() {
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/index.html", indexHandler)
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

	msg := mustParse("error")

	http.HandleFunc("/login", loginHandler(msg))
	http.HandleFunc("/register", registerHandler(msg))

	live := mustParse("live")
	http.HandleFunc("/live.html", liveHandler(live))

	log.Println("Listen and serve...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func mustParse(name string) *pongo2.Template {
	templ, err := pongo2.FromFile("templates/" + name + ".html")
	if err != nil {
		panic(err)
	}
	return templ
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	_, err := r.Cookie("api_token")
	if err == nil {
		http.Redirect(w, r, "/live.html", http.StatusSeeOther)
	} else {
		http.Redirect(w, r, "/static/login.html", http.StatusMovedPermanently)
	}
}

func loginHandler(msgTempl *pongo2.Template) func(http.ResponseWriter, *http.Request) {
	return accountHandler(msgTempl, "http://127.0.0.1:8000/api/v1/account/login")
}

func registerHandler(msgTempl *pongo2.Template) func(http.ResponseWriter, *http.Request) {
	return accountHandler(msgTempl, "http://127.0.0.1:8000/api/v1/account/register")
}

func accountHandler(msgTempl *pongo2.Template, apiURL string) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseForm()
		if err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		resp, err := http.PostForm(apiURL, r.PostForm)
		if err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		jsonData, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		data := map[string]interface{}{}
		if err := json.Unmarshal([]byte(jsonData), &data); err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		if resp.StatusCode >= 400 {
			msgTempl.ExecuteWriter(pongo2.Context(data), w)
			return
		}

		//	Jan 2 15:04:05 2006 MST
		// "1985-04-12T23:20:50.52.000+03:00"
		account := data["account"].(map[string]interface{})
		token := account["apiKey"].(string)
		validThru := account["validThru"].(string)
		exp, _ := time.Parse("2006-02-01T15:04:05.000", validThru)
		cookie := http.Cookie{
			Name:    "api_token",
			Value:   token,
			Expires: exp,
		}
		http.SetCookie(w, &cookie)

		http.Redirect(w, r, "/live.html", http.StatusSeeOther)
	}
}

func liveHandler(templ *pongo2.Template) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		token, err := r.Cookie("api_token")
		if err != nil {
			http.Redirect(w, r, "/static/login.html", http.StatusSeeOther)
			return
		}

		req, err := http.NewRequest("get", "http://127.0.0.1:8000/api/v1/entries/live", nil)
		if err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		req.Header.Add("X-User-Key", token.Value)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		if resp.StatusCode >= 400 {
			cookie := http.Cookie{
				Name:  "api_token",
				Value: "",
			}
			http.SetCookie(w, &cookie)
			http.Redirect(w, r, "/static/login.html", http.StatusSeeOther)
			return
		}

		data, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		live := map[string]interface{}{}
		if err := json.Unmarshal([]byte(data), &live); err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		templ.ExecuteWriter(pongo2.Context(live), w)
	}
}
