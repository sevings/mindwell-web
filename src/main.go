package main

import (
	"encoding/json"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/eknkc/amber"
)

func main() {
	templ := amber.MustCompileDir("templates", amber.DefaultDirOptions, amber.DefaultOptions)
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/index.html", indexHandler)
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/register", registerHandler)
	http.HandleFunc("/live.html", liveHandler(templ["live"]))
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func templateHandler(templ *template.Template) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		templ.Execute(w, nil)
	}
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	_, err := r.Cookie("api_token")
	if err == nil {
		http.Redirect(w, r, "/live.html", http.StatusSeeOther)
	} else {
		http.Redirect(w, r, "/static/login.html", http.StatusMovedPermanently)
	}
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	name := r.PostFormValue("name")
	pass := r.PostFormValue("password")

	form := url.Values{}
	form.Set("name", name)
	form.Set("password", pass)

	resp, err := http.PostForm("http://127.0.0.1:8000/api/v1/account/login", form)
	if err != nil {
		w.Write([]byte(err.Error()))
		return
	}

	if resp.StatusCode >= 400 {
		w.Write([]byte("Неверный логин или пароль"))
		return
	}

	data, err := ioutil.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		w.Write([]byte(err.Error()))
		return
	}

	user := map[string]interface{}{}
	if err := json.Unmarshal([]byte(data), &user); err != nil {
		w.Write([]byte(err.Error()))
		return
	}

	//	Jan 2 15:04:05 2006 MST
	// "1985-04-12T23:20:50.52.000+03:00"
	account := user["account"].(map[string]interface{})
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

func registerHandler(w http.ResponseWriter, r *http.Request) {

}

func liveHandler(templ *template.Template) func(http.ResponseWriter, *http.Request) {
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

		templ.Execute(w, live)
	}
}

func godHandler(templ *template.Template) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Path
		resp, err := http.Get("https://godville.net/gods/api/" + name + ".json")
		if err != nil {
			w.Write([]byte(err.Error()))
		}
		data, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			w.Write([]byte(err.Error()))
		}

		user := map[string]interface{}{}
		if err := json.Unmarshal([]byte(data), &user); err != nil {
			w.Write([]byte(err.Error()))
		}

		templ.Execute(w, user)
	}
}
