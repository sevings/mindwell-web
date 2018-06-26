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

	router.Static("/assets/", "./web/assets/")

	router.GET("/", rootHandler)
	router.GET("/index.html", indexHandler(mdw))

	router.GET("/logout", logoutHandler(mdw))
	router.POST("/login", loginHandler(mdw))
	router.POST("/register", registerHandler(mdw))

	router.GET("/live", liveHandler(mdw))
	router.GET("/friends", friendsHandler(mdw))

	router.GET("/users/:name", tlogHandler(mdw))
	router.GET("/users/:name/:relation", usersHandler(mdw))

	router.GET("/me", meHandler(mdw))
	router.GET("/me/:relation", meUsersHandler(mdw))

	router.POST("/profile/save", meSaverHandler(mdw))
	router.POST("/profile/avatar", avatarSaverHandler(mdw))
	router.POST("/profile/cover", coverSaverHandler(mdw))

	router.POST("/account/verification", proxyHandler(mdw))
	router.GET("/account/verification/:email", verifyEmailHandler(mdw))
	router.GET("/account/invites", invitesHandler(mdw))

	router.GET("/design", designEditorHandler(mdw))
	router.POST("/design", designSaverHandler(mdw))

	router.GET("/post", editorHandler(mdw))
	router.POST("/entries", postHandler(mdw))

	router.GET("/entries/:id/edit", editorExistingHandler(mdw))
	router.POST("/entries/:id", editPostHandler(mdw))

	router.GET("/entries/:id", entryHandler(mdw))
	router.DELETE("/entries/:id", proxyHandler(mdw))

	router.GET("/entries/:id/comments", commentsHandler(mdw))
	router.POST("/entries/:id/comments", postCommentHandler(mdw))

	router.PUT("/me/online", meOnlineHandler(mdw))

	router.PUT("/entries/:id/vote", proxyHandler(mdw))

	router.GET("/relations/to/:id", proxyHandler(mdw))
	router.PUT("/relations/to/:id", proxyHandler(mdw))
	router.DELETE("/relations/to/:id", proxyHandler(mdw))

	router.GET("/relations/from/:id", proxyHandler(mdw))
	router.PUT("/relations/from/:id", proxyHandler(mdw))
	router.DELETE("/relations/from/:id", proxyHandler(mdw))

	router.NoRoute(error404Handler(mdw))

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

func logoutHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ClearCookie()
		ctx.Redirect(http.StatusSeeOther, "/index.html")
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

		account := api.Data()["account"].(map[string]interface{})
		token := account["apiKey"].(string)
		validThru, _ := account["validThru"].(json.Number).Float64()
		exp := time.Unix(int64(validThru), 0)
		cookie := http.Cookie{
			Name:     "api_token",
			Value:    token,
			Expires:  exp,
			HttpOnly: true,
		}
		http.SetCookie(ctx.Writer, &cookie)

		api.Redirect("/live")
	}
}

func feedHandler(mdw *utils.Mindwell, apiPath, webPath, templateName, ajaxTemplateName string, clbk func(*utils.APIRequest)) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo(apiPath)
		api.SetScrollHrefs(webPath)

		if api.IsAjax() {
			api.WriteTemplate(ajaxTemplateName)
		} else {
			api.SetMe()

			if clbk != nil {
				clbk(api)
			}

			api.WriteTemplate(templateName)
		}
	}
}

func liveHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return feedHandler(mdw, "/entries/live", "/live", "live", "feed_page", nil)
}

func friendsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return feedHandler(mdw, "/entries/friends", "/friends", "friends", "feed_page", nil)
}

func tlogHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		name := ctx.Param("name")

		api := utils.NewRequest(mdw, ctx)
		api.Get("/users/byName/" + name)
		id, ok := api.Data()["id"].(json.Number)
		if !ok {
			api.WriteTemplate("error")
			return
		}

		clbk := func(api *utils.APIRequest) {
			api.SetField("profile", "/users/byName/"+name)
		}

		handle := feedHandler(mdw, "/entries/users/"+id.String(), "/users/"+name, "tlog", "tlog_page", clbk)
		handle(ctx)
	}
}

func usersHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		name := ctx.Param("name")
		path := "/users/byName/" + name + "/" + ctx.Param("relation")
		api.ForwardTo(path)
		api.SetMe()
		api.SetField("profile", "/users/byName/"+name)
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
	clbk := func(api *utils.APIRequest) {
		api.SetData("profile", api.Data()["me"])
	}

	return feedHandler(mdw, "/entries/users/me", "/me", "tlog", "tlog_page", clbk)
}

func meSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardTo("PUT", "/users/me")
		api.Redirect("/me")
	}
}

func avatarSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardToImages("PUT", "/users/me/avatar")
		api.Redirect("/me")
	}
}

func coverSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardToImages("PUT", "/users/me/cover")
		api.Redirect("/me")
	}
}

func verifyEmailHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardToNotAuthorized(ctx.Request.URL.Path)
		api.WriteTemplate("verified")
	}
}

func invitesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		api.SetMe()
		api.WriteTemplate("invites")
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
		api.SetMe()
		api.WriteTemplate("editor")
	}
}

func postHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/entries/users/me")
		api.Redirect("/me")
	}
}

func editorExistingHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Get("/entries/" + ctx.Param("id"))
		api.SetMe()
		api.WriteTemplate("editor")
	}
}

func writeEntry(api *utils.APIRequest) {
	entry := api.Data()
	api.ClearData()
	api.SetData("entry", entry)

	if entry != nil {
		author := entry["author"].(map[string]interface{})
		id := author["id"].(json.Number)
		api.SetField("profile", "/users/"+string(id))

		entryID := entry["id"].(json.Number).String()
		cmts := entry["comments"].(map[string]interface{})
		api.SetScrollHrefsWithData("/entries/"+entryID+"/comments", cmts)
	}

	api.SetMe()
	api.WriteTemplate("entry")
}

func editPostHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForward("PUT")
		api.SetField("comments", "/entries/"+ctx.Param("id")+"/comments")
		writeEntry(api)
	}
}

func entryHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		writeEntry(api)
	}
}

func commentsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		entryID := ctx.Param("id")
		api.SetScrollHrefs("/entries/" + entryID + "/comments")

		api.WriteTemplate("comments_page")
	}
}

func postCommentHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		cmt := api.Data()
		api.ClearData()
		api.SetData("comment", cmt)

		api.WriteTemplate("comment")
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

func error404Handler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetData("code", 404)
		api.SetData("message", "Мы очень старались, но не смогли найти страницу по такому адресу.")
		api.WriteTemplate("error")
	}
}
