package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/sevings/mindwell-web/internal/app/mindwell-web/utils"
)

func main() {
	mdw := utils.NewMindwell()

	mode := mdw.ConfigString("mode")
	gin.SetMode(mode)

	router := gin.Default()

	assets := mdw.ConfigString("assets_path")
	router.Static("/assets/", assets)

	avatars := mdw.ConfigString("avatars_path")
	router.Static("/avatars/", avatars)

	swagger := mdw.ConfigString("swagger_path")
	router.Static("/help/api/", swagger)

	router.GET("/", rootHandler)
	router.GET("/index.html", indexHandler(mdw))

	router.POST("/login", loginHandler(mdw))
	router.POST("/register", registerHandler(mdw))

	router.GET("/live", liveHandler(mdw))
	router.GET("/friends", friendsHandler(mdw))

	router.GET("/users/:name", tlogHandler(mdw))
	router.GET("/users/:name/:relation", usersHandler(mdw))

	router.GET("/me", meHandler(mdw))
	router.GET("/me/:relation", meUsersHandler(mdw))

	router.GET("/profile/edit", meEditorHandler(mdw))
	router.POST("/profile/save", meSaverHandler(mdw))

	router.GET("/design", designEditorHandler(mdw))
	router.POST("/design", designSaverHandler(mdw))

	router.PUT("/me/online", meOnlineHandler(mdw))

	router.GET("/post", editorHandler(mdw))

	router.POST("/entries/users/me", postHandler(mdw))
	router.PUT("/entries/:id/vote", proxyHandler(mdw))

	router.GET("/relations/to/:id", proxyHandler(mdw))
	router.PUT("/relations/to/:id", proxyHandler(mdw))
	router.DELETE("/relations/to/:id", proxyHandler(mdw))

	router.GET("/relations/from/:id", proxyHandler(mdw))
	router.PUT("/relations/from/:id", proxyHandler(mdw))
	router.DELETE("/relations/from/:id", proxyHandler(mdw))

	router.Any("/api/v1/*function", apiReverseProxy(mdw))

	addr := mdw.ConfigString("listen_address")
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

func rootHandler(ctx *gin.Context) {
	_, err := ctx.Request.Cookie("api_token")
	if err == nil {
		ctx.Redirect(http.StatusSeeOther, "/live")
	} else {
		ctx.Redirect(http.StatusSeeOther, "/index.html")
	}
}

func indexHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("index")
	}
}

func loginHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return accountHandler(mdw, "/account/login")
}

func registerHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return accountHandler(mdw, "/account/register")
}

func accountHandler(mdw *utils.Mindwell, path string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardToNotAuthorized(path)
		if api.Error() != nil {
			return
		}

		//	Jan 2 15:04:05 2006 MST
		// "1985-04-12T23:20:50.52.000+03:00"
		account := api.Data()["account"].(map[string]interface{})
		token := account["apiKey"].(string)
		validThru := account["validThru"].(string)
		exp, _ := time.Parse("2006-01-02T15:04:05.999Z07:00", validThru)
		cookie := http.Cookie{
			Name:     "api_token",
			Value:    token,
			Expires:  exp,
			HttpOnly: true,
		}
		http.SetCookie(ctx.Writer, &cookie)

		ctx.Redirect(http.StatusSeeOther, "/live")
	}
}

func liveHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/entries/live")
		api.SetMe()
		api.WriteTemplate("live")
	}
}

func friendsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/entries/friends")
		api.SetMe()
		api.WriteTemplate("friends")
	}
}

func tlogHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Get("/users/byName/" + ctx.Param("name"))
		id, ok := api.Data()["id"].(json.Number)
		if !ok {
			api.WriteTemplate("error")
			return
		}

		api.ClearData()
		path := "/entries/users/" + id.String() //! \todo get tlog by name
		api.ForwardTo(path)
		api.SetMe()
		api.SetProfile()
		api.WriteTemplate("tlog")
	}
}

func usersHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		path := "/users/byName/" + ctx.Param("name") + "/" + ctx.Param("relation")
		api.ForwardTo(path)
		api.SetMe()
		api.WriteTemplate("users")
	}
}

func meUsersHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		path := "/users/me/" + ctx.Param("relation")
		api.ForwardTo(path)
		api.SetMe()
		api.WriteTemplate("users")
	}
}

func meHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/entries/users/me")
		api.SetMe()
		api.SetData("profile", api.Data()["me"])
		api.WriteTemplate("tlog")
	}
}

func meEditorHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Get("/users/me")
		api.WriteTemplate("edit_profile")
	}
}

func meSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardTo("PUT", "/users/me")
		api.Redirect("/me")
	}
}

func designEditorHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Get("/design")
		api.WriteTemplate("design")
	}
}

func designSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardTo("PUT", "/design")
		api.Redirect("/me")
	}
}

func editorHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("post")
	}
}

func postHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/entries/users/me")
		api.Redirect("/me")
	}
}

func proxyHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		api.WriteResponse()
	}
}

func meOnlineHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/users/me/online")
		api.WriteResponse()
	}
}

func apiReverseProxy(mdw *utils.Mindwell) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardToNoCookie(ctx.Request.URL.Path[7:])
		api.WriteResponse()
	}
}
