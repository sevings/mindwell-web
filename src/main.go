package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/flosch/pongo2"
)

func main() {

	router := gin.Default()

	router.GET("/", indexHandler)
	router.GET("/index.html", indexHandler)
	router.Static("/static/", "./static")

	msg := mustParse("error")

	router.POST("/login", loginHandler(msg))
	router.POST("/register", registerHandler(msg))

	live := mustParse("live")
	router.GET("/live", liveHandler(live))

	tlog := mustParse("tlog")
	router.GET("/users/:name", tlogHandler(tlog, msg))

	srv := &http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	go func() {
		// service connections
		if err := srv.ListenAndServe(); err != nil {
			log.Printf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit
	log.Println("Shutdown Server ...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server Shutdown:", err)
	}
	log.Println("Server exiting")
}

func mustParse(name string) *pongo2.Template {
	templ, err := pongo2.FromFile("templates/" + name + ".html")
	if err != nil {
		panic(err)
	}
	return templ
}

func indexHandler(ctx *gin.Context) {
	_, err := ctx.Request.Cookie("api_token")
	if err == nil {
		ctx.Redirect(http.StatusSeeOther, "/live")
	} else {
		ctx.Redirect(http.StatusSeeOther, "/static/login.html")
	}
}

func loginHandler(msgTempl *pongo2.Template) func(ctx *gin.Context) {
	return accountHandler(msgTempl, "http://127.0.0.1:8000/api/v1/account/login")
}

func registerHandler(msgTempl *pongo2.Template) func(ctx *gin.Context) {
	return accountHandler(msgTempl, "http://127.0.0.1:8000/api/v1/account/register")
}

func accountHandler(msgTempl *pongo2.Template, apiURL string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		err := ctx.Request.ParseForm()
		if err != nil {
			ctx.Writer.WriteString(err.Error())
			return
		}

		resp, err := http.PostForm(apiURL, ctx.Request.PostForm)
		if err != nil {
			ctx.Writer.WriteString(err.Error())
			return
		}

		jsonData, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			ctx.Writer.WriteString(err.Error())
			return
		}

		data := map[string]interface{}{}
		if err := json.Unmarshal([]byte(jsonData), &data); err != nil {
			ctx.Writer.Write([]byte(err.Error()))
			return
		}

		if resp.StatusCode >= 400 {
			msgTempl.ExecuteWriter(pongo2.Context(data), ctx.Writer)
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
		http.SetCookie(ctx.Writer, &cookie)

		ctx.Redirect(http.StatusSeeOther, "/live")
	}
}

func apiRequest(ctx *gin.Context, method, url string) (*http.Response, error) {
	token, err := ctx.Request.Cookie("api_token")
	if err != nil {
		ctx.Redirect(http.StatusSeeOther, "/static/login.html")
		return nil, err
	}

	req, err := http.NewRequest("get", url, nil)
	if err != nil {
		ctx.Writer.WriteString(err.Error())
		return nil, err
	}

	req.Header.Add("X-User-Key", token.Value)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		ctx.Writer.WriteString(err.Error())
		return nil, err
	}

	return resp, nil
}

func readJSON(ctx *gin.Context, resp *http.Response) (map[string]interface{}, error) {
	jsonData, err := ioutil.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		ctx.Writer.WriteString(err.Error())
		return nil, err
	}

	data := map[string]interface{}{}
	decoder := json.NewDecoder(bytes.NewBuffer(jsonData))
	decoder.UseNumber()
	if err := decoder.Decode(&data); err != nil {
		ctx.Writer.WriteString(err.Error())
		ctx.Writer.WriteString("\n")
		ctx.Writer.Write(jsonData)
		return nil, err
	}

	return data, nil
}

func liveHandler(templ *pongo2.Template) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		resp, err := apiRequest(ctx, "get", "http://127.0.0.1:8000/api/v1/entries/live")
		if err != nil {
			return
		}

		if resp.StatusCode < 400 {
			data, err := readJSON(ctx, resp)
			if err == nil {
				templ.ExecuteWriter(pongo2.Context(data), ctx.Writer)
			}
			return
		}

		cookie := http.Cookie{
			Name:  "api_token",
			Value: "",
		}
		http.SetCookie(ctx.Writer, &cookie)
		ctx.Redirect(http.StatusSeeOther, "/static/login.html")
		return
	}
}

func tlogHandler(templ, msgTempl *pongo2.Template) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		url := "http://127.0.0.1:8000/api/v1/users/byName/" + ctx.Param("name")
		resp, err := apiRequest(ctx, "get", url)
		if err != nil {
			return
		}

		user, err := readJSON(ctx, resp)
		if err != nil {
			return
		}
		if resp.StatusCode >= 400 {
			msgTempl.ExecuteWriter(pongo2.Context(user), ctx.Writer)
			return
		}

		id := user["id"].(json.Number)
		url = "http://127.0.0.1:8000/api/v1/entries/users/" + string(id)
		resp, err = apiRequest(ctx, "get", url)
		if err != nil {
			return
		}

		tlog, err := readJSON(ctx, resp)
		if err != nil {
			return
		}
		if resp.StatusCode >= 400 {
			msgTempl.ExecuteWriter(pongo2.Context(tlog), ctx.Writer)
			return
		}

		tlog["profile"] = user
		templ.ExecuteWriter(pongo2.Context(tlog), ctx.Writer)
	}
}
