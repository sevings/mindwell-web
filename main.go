package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/signal"
	"time"

	goconf "github.com/zpatrick/go-config"

	"github.com/gin-gonic/gin"

	"github.com/flosch/pongo2"
)

func main() {
	config := loadConfig("web")
	mode, err := config.String("mode")
	if err != nil {
		log.Println(err)
	}

	gin.SetMode(mode)

	baseURL, err := config.String("base_url")
	if err != nil {
		log.Println(err)
	}

	router := gin.Default()

	router.GET("/", rootHandler)

	index := mustParse("index")
	router.GET("/index.html", indexHandler(index))

	router.Static("/assets/", "./web/assets")

	msg := mustParse("error")

	router.POST("/login", loginHandler(msg, baseURL))
	router.POST("/register", registerHandler(msg, baseURL))

	live := mustParse("live")
	router.GET("/live", liveHandler(live, baseURL))

	tlog := mustParse("tlog")
	router.GET("/users/:name", tlogHandler(tlog, msg, baseURL))
	router.GET("/me", meHandler(tlog, msg, baseURL))

	post := mustParse("post")
	router.GET("/post", editorHandler(post))

	router.POST("/entries/users/me", postHandler(msg, baseURL))
	router.PUT("/entries/:id/vote", entryVoteHandler(baseURL))

	addr, err := config.String("listen_address")
	if err != nil {
		println(err)
	}

	srv := &http.Server{
		Addr:    addr,
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

func loadConfig(fileName string) *goconf.Config {
	toml := goconf.NewTOMLFile("configs/" + fileName + ".toml")
	loader := goconf.NewOnceLoader(toml)
	config := goconf.NewConfig([]goconf.Provider{loader})
	if err := config.Load(); err != nil {
		log.Fatal(err)
	}
	return config
}

func mustParse(name string) *pongo2.Template {
	templ, err := pongo2.FromFile("web/templates/" + name + ".html")
	if err != nil {
		panic(err)
	}
	return templ
}

func rootHandler(ctx *gin.Context) {
	_, err := ctx.Request.Cookie("api_token")
	if err == nil {
		ctx.Redirect(http.StatusSeeOther, "/live")
	} else {
		ctx.Redirect(http.StatusSeeOther, "/index.html")
	}
}

func indexHandler(templ *pongo2.Template) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		templ.ExecuteWriter(pongo2.Context(nil), ctx.Writer)
	}
}

func loginHandler(msgTempl *pongo2.Template, baseURL string) func(ctx *gin.Context) {
	return accountHandler(msgTempl, baseURL+"/account/login")
}

func registerHandler(msgTempl *pongo2.Template, baseURL string) func(ctx *gin.Context) {
	return accountHandler(msgTempl, baseURL+"/account/register")
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

		data, err := readJSON(ctx, resp)
		if err != nil {
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
		exp, _ := time.Parse("2006-01-02T15:04:05.999Z07:00", validThru)
		cookie := http.Cookie{
			Name:    "api_token",
			Value:   token,
			Expires: exp,
		}
		http.SetCookie(ctx.Writer, &cookie)

		ctx.Redirect(http.StatusSeeOther, "/live")
	}
}

func apiRequest(ctx *gin.Context, method, url string, body io.Reader) (*http.Response, error) {
	token, err := ctx.Request.Cookie("api_token")
	if err != nil {
		ctx.Redirect(http.StatusSeeOther, "/index.html")
		return nil, err
	}

	req, err := http.NewRequest(method, url, body)
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

func redirectApiRequest(ctx *gin.Context, url string) (*http.Response, error) {
	token, err := ctx.Request.Cookie("api_token")
	if err != nil {
		ctx.Redirect(http.StatusSeeOther, "/index.html")
		return nil, err
	}

	err = ctx.Request.ParseForm()
	if err != nil {
		ctx.Writer.WriteString(err.Error())
		return nil, err
	}

	bodyBuf := &bytes.Buffer{}
	bodyWriter := multipart.NewWriter(bodyBuf)

	for k, v := range ctx.Request.PostForm {
		bodyWriter.WriteField(k, v[0])
	}
	contentType := bodyWriter.FormDataContentType()
	bodyWriter.Close()

	req, err := http.NewRequest(ctx.Request.Method, url, bodyBuf)
	if err != nil {
		ctx.Writer.WriteString(err.Error())
		return nil, err
	}

	req.Header.Set("Content-Type", contentType)
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

func requestMe(ctx *gin.Context, baseURL string) (map[string]interface{}, error) {
	url := baseURL + "/users/me"
	resp, err := apiRequest(ctx, "get", url, nil)
	if err != nil {
		return nil, err
	}

	return readJSON(ctx, resp)
}

func liveHandler(templ *pongo2.Template, baseURL string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		url := baseURL + "/entries/live"
		resp, err := apiRequest(ctx, "get", url, nil)
		if err != nil {
			return
		}

		if resp.StatusCode >= 400 {
			cookie := http.Cookie{
				Name:    "api_token",
				Value:   "",
				Path:    "/",
				Expires: time.Unix(0, 0),
			}
			http.SetCookie(ctx.Writer, &cookie)
			ctx.Redirect(http.StatusSeeOther, "/index.html")
			return
		}

		data, err := readJSON(ctx, resp)
		if err != nil {
			return
		}

		me, err := requestMe(ctx, baseURL)
		if err == nil {
			data["me"] = me
		}

		templ.ExecuteWriter(pongo2.Context(data), ctx.Writer)
	}
}

func tlogHandler(templ, msgTempl *pongo2.Template, baseURL string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		url := baseURL + "/users/byName/" + ctx.Param("name")
		resp, err := apiRequest(ctx, "get", url, nil)
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
		url = baseURL + "/entries/users/" + string(id)
		resp, err = apiRequest(ctx, "get", url, nil)
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

		me, err := requestMe(ctx, baseURL)
		if err == nil {
			tlog["me"] = me
		}

		templ.ExecuteWriter(pongo2.Context(tlog), ctx.Writer)
	}
}

func meHandler(templ, msgTempl *pongo2.Template, baseURL string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		user, err := requestMe(ctx, baseURL)
		if err != nil {
			return
		}

		id := user["id"].(json.Number)
		url := baseURL + "/entries/users/" + string(id)
		resp, err := apiRequest(ctx, "get", url, nil)
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
		tlog["me"] = user
		templ.ExecuteWriter(pongo2.Context(tlog), ctx.Writer)
	}
}

func editorHandler(templ *pongo2.Template) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		templ.ExecuteWriter(nil, ctx.Writer)
	}
}

func postHandler(msgTempl *pongo2.Template, baseURL string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		resp, err := redirectApiRequest(ctx, baseURL+"/entries/users/me")
		if err != nil {
			return
		}

		if resp.StatusCode >= 400 {
			ctx.Status(resp.StatusCode)
			data, err := readJSON(ctx, resp)
			if err == nil {
				msgTempl.ExecuteWriter(pongo2.Context(data), ctx.Writer)
			}
			return
		}

		ctx.Redirect(http.StatusSeeOther, "/me")
	}
}

func entryVoteHandler(baseURL string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		url := baseURL + "/entries/" + ctx.Param("id") + "/vote?positive=" + ctx.Query("positive")
		resp, err := apiRequest(ctx, "put", url, nil)
		if err != nil {
			return
		}

		jsonData, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			ctx.Writer.WriteString(err.Error())
			return
		}

		ctx.Header("Content-Type", resp.Header.Get("Content-Type"))
		ctx.Status(resp.StatusCode)

		ctx.Writer.Write(jsonData)
	}
}
