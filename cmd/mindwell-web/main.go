package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/sevings/mindwell-web/internal/app/mindwell-web/utils"
)

func main() {
	mdw := utils.NewMindwell()

	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(utils.LogHandler(mdw.LogWeb()))
	router.Use(gin.Recovery())

	router.Static("/assets/", "./web/assets/")

	router.GET("/", rootHandler)
	router.GET("/index.html", indexHandler(mdw))

	router.GET("/account/logout", logoutHandler(mdw))
	router.POST("/account/login", accountHandler(mdw, "/live"))
	router.POST("/account/register", accountHandler(mdw, "/me"))

	router.POST("/account/verification", proxyHandler(mdw))
	router.GET("/account/verification/:email", verifyEmailHandler(mdw))

	router.GET("/account/invites", invitesHandler(mdw))

	router.GET("/account/password", passwordHandler(mdw))
	router.POST("/account/password", proxyHandler(mdw))

	router.GET("/account/email", emailHandler(mdw))
	router.POST("/account/email", proxyHandler(mdw))

	router.GET("/account/ignored", ignoredHandler(mdw))
	router.GET("/account/hidden", hiddenHandler(mdw))

	router.GET("/account/notifications", notificationsSettingsHandler(mdw))
	router.PUT("/account/settings/email", proxyHandler(mdw))
	router.PUT("/account/settings/telegram", proxyHandler(mdw))

	router.GET("/account/subscribe/token", proxyHandler(mdw))

	router.GET("/adm", admHandler(mdw))

	router.POST("/adm/grandson", grandsonSaverHandler(mdw))
	router.GET("/adm/grandson/status", proxyHandler(mdw))
	router.POST("/adm/grandson/status", proxyHandler(mdw))

	router.GET("/adm/grandfather/status", proxyHandler(mdw))
	router.POST("/adm/grandfather/status", proxyHandler(mdw))

	router.GET("/account/recover", resetPasswordHandler(mdw))
	router.POST("/account/recover", proxyNotAuthorizedHandler(mdw))
	router.POST("/account/recover/password", recoverHandler(mdw))

	router.GET("/live", liveHandler(mdw))
	router.GET("/best", bestHandler(mdw))
	router.GET("/friends", friendsHandler(mdw))
	router.GET("/watching", watchingHandler(mdw))

	router.GET("/users", topsHandler(mdw))
	router.GET("/users/:name", tlogHandler(mdw))
	router.GET("/users/:name/favorites", favoritesHandler(mdw))
	router.GET("/users/:name/relations/:relation", usersHandler(mdw))

	router.GET("/me", meHandler(mdw))
	router.GET("/me/:relation", meUsersHandler(mdw))

	router.POST("/profile/save", meSaverHandler(mdw))
	router.POST("/profile/avatar", avatarSaverHandler(mdw))
	router.POST("/profile/cover", coverSaverHandler(mdw))

	router.GET("/design", designEditorHandler(mdw))
	router.POST("/design", designSaverHandler(mdw))

	router.GET("/editor", editorHandler(mdw))
	router.POST("/entries", postHandler(mdw))

	router.GET("/entries/:id/edit", editorExistingHandler(mdw))
	router.POST("/entries/:id", editPostHandler(mdw))

	router.GET("/entries/:id", entryHandler(mdw))
	router.DELETE("/entries/:id", proxyHandler(mdw))

	router.GET("/entries/:id/comments", commentsHandler(mdw))
	router.POST("/entries/:id/comments", postCommentHandler(mdw))

	router.POST("/comments/:id", editCommentHandler(mdw))
	router.DELETE("/comments/:id", proxyHandler(mdw))

	router.PUT("/me/online", proxyHandler(mdw))

	router.PUT("/entries/:id/vote", proxyHandler(mdw))
	router.DELETE("/entries/:id/vote", proxyHandler(mdw))

	router.PUT("/comments/:id/vote", proxyHandler(mdw))
	router.DELETE("/comments/:id/vote", proxyHandler(mdw))

	router.PUT("/entries/:id/watching", proxyHandler(mdw))
	router.DELETE("/entries/:id/watching", proxyHandler(mdw))

	router.PUT("/entries/:id/favorite", proxyHandler(mdw))
	router.DELETE("/entries/:id/favorite", proxyHandler(mdw))

	router.POST("/entries/:id/complain", proxyHandler(mdw))
	router.POST("/comments/:id/complain", proxyHandler(mdw))

	router.GET("/relations/to/:name", proxyHandler(mdw))
	router.PUT("/relations/to/:name", proxyHandler(mdw))
	router.DELETE("/relations/to/:name", proxyHandler(mdw))

	router.POST("/relations/invited/:name", proxyHandler(mdw))

	router.GET("/relations/from/:name", proxyHandler(mdw))
	router.PUT("/relations/from/:name", proxyHandler(mdw))
	router.DELETE("/relations/from/:name", proxyHandler(mdw))

	router.GET("/notifications", notificationsHandler(mdw))
	router.GET("/notifications/:id", singleNotificationHandler(mdw))
	router.PUT("/notifications/read", proxyHandler(mdw))

	router.POST("/images", imageHandler(mdw))
	router.GET("/images/:id", imageHandler(mdw))
	router.DELETE("/images/:id", deleteImageHandler(mdw))

	router.GET("/chats", chatsHandler(mdw))
	router.GET("/chats/:name", chatHandler(mdw))
	router.PUT("/chats/:name/read", proxyHandler(mdw))

	router.GET("/chats/:name/messages", messagesHandler(mdw))
	router.POST("/chats/:name/messages", sendMessageHandler(mdw))

	router.GET("/messages/:id", singleMessageHandler(mdw))
	router.POST("/messages/:id", editMessageHandler(mdw))
	router.DELETE("/messages/:id", proxyHandler(mdw))

	router.GET("/help/about", aboutHandler(mdw))
	router.GET("/help/rules", rulesHandler(mdw))
	router.GET("/help/faq/", faqHandler(mdw))
	router.GET("/help/faq/md", faqMdHandler(mdw))
	router.GET("/help/faq/votes", faqVotesHandler(mdw))
	router.GET("/help/faq/invites", faqInvitesHandler(mdw))

	router.NoRoute(error404Handler(mdw))

	addr := mdw.ConfigString("listen_address")
	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	go func() {
		mdw.LogSystem().Info("Serving mindwell web at " + addr)

		if err := srv.ListenAndServe(); err != nil {
			mdw.LogSystem().Error(err.Error())
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit
	mdw.LogSystem().Info("Shutdown server")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		mdw.LogSystem().Fatal(err.Error())
	}

	mdw.LogSystem().Info("Exit server")
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
		_, err := ctx.Request.Cookie("api_token")
		if err == nil {
			ctx.Redirect(http.StatusSeeOther, "/live")
		} else {
			api.WriteTemplate("index")
		}
	}
}

func logoutHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ClearCookieToken()
		ctx.Redirect(http.StatusSeeOther, "/index.html")
	}
}

func accountHandler(mdw *utils.Mindwell, redirectPath string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardNotAuthorized()
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
			Path:     "/",
		}
		api.SetCookie(&cookie)

		api.ClearData()
		api.SetData("path", redirectPath)
		api.WriteJson()
	}
}

func verifyEmailHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardNotAuthorized()
		api.WriteTemplate("verified")
	}
}

func SetAdm(mdw *utils.Mindwell, ctx *gin.Context, api *utils.APIRequest) {
	if mdw.ConfigBool("adm.adm_finished") {
		return
	}

	req := utils.NewRequest(mdw, ctx)

	if mdw.ConfigBool("adm.reg_finished") {
		req.ForwardTo("/adm/grandfather")
	} else {
		req.ForwardTo("/adm/grandson")
	}

	api.SetData("__adm", req.Error() == nil)
}

func invitesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		if api.IsAjax() {
			api.WriteResponse()
		} else {
			api.SetMe()
			SetAdm(mdw, ctx, api)
			api.WriteTemplate("settings/invites")
		}
	}
}

func passwordHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetMe()
		SetAdm(mdw, ctx, api)
		api.WriteTemplate("settings/password")
	}
}

func emailHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetMe()
		SetAdm(mdw, ctx, api)
		api.WriteTemplate("settings/email")
	}
}

func ignoredHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/me/ignored")
		api.SetMe()
		SetAdm(mdw, ctx, api)
		api.WriteTemplate("settings/ignored")
	}
}

func hiddenHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/me/hidden")
		api.SetMe()
		SetAdm(mdw, ctx, api)
		api.WriteTemplate("settings/hidden")
	}
}

func notificationsSettingsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	bot := mdw.ConfigString("telegram.bot")

	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetMe()
		api.SetField("email", "/account/settings/email")
		api.SetField("telegram", "/account/settings/telegram")
		api.SetField("bot", "/account/subscribe/telegram")
		api.SetData("__tg", bot)
		SetAdm(mdw, ctx, api)
		api.WriteTemplate("settings/notifications")
	}
}

func admHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	regFinished := mdw.ConfigBool("adm.reg_finished")

	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		if regFinished {
			api.ForwardTo("/adm/grandfather")
		} else {
			api.ForwardTo("/adm/grandson")
		}

		if api.Error() != nil {
			api.WriteTemplate("error")
			return
		}

		api.SetField("stat", "/adm/stat")
		api.SetMe()
		api.SetData("__adm", true)

		if regFinished {
			api.SetField("son", "/adm/grandson/status")
			api.SetField("father", "/adm/grandfather/status")

			api.WriteTemplate("settings/grandfather")
		} else {
			api.WriteTemplate("settings/grandson")
		}
	}
}

func grandsonSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		api.WriteResponse()
	}
}

func resetPasswordHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetData("__code", ctx.Query("code"))
		api.SetData("__email", ctx.Query("email"))
		api.SetData("__date", ctx.Query("date"))
		api.WriteTemplate("recover")
	}
}

func recoverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardNotAuthorized()
		api.WriteResponse()
	}
}

func feedHandler(mdw *utils.Mindwell, templateName, queryName string) func(ctx *gin.Context, apiPath string, clbk func(*utils.APIRequest)) {
	return func(ctx *gin.Context, apiPath string, clbk func(*utils.APIRequest)) {
		api := utils.NewRequest(mdw, ctx)

		if len(queryName) > 0 {
			api.QueryCookieName(queryName)
		}

		api.ForwardTo(apiPath)
		api.SetScrollHrefs()

		tag := ctx.Query("tag")
		api.SetData("__tag", tag)

		if api.StatusCode() == 404 {
			// private tlog, skip error
			api = utils.NewRequest(mdw, ctx)
		}

		isAjax := api.IsAjax()

		if !isAjax {
			api.SetMe()
		}

		if clbk != nil {
			clbk(api)
		}

		if isAjax {
			view, ok := api.Data()["__view"].(string)
			if ok && view == "masonry" {
				api.WriteTemplate("entries/feed_page")
			} else {
				api.WriteTemplate("entries/tlog_page")
			}
		} else {
			api.WriteTemplate(templateName)
		}
	}
}

func liveHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	handle := feedHandler(mdw, "entries/live", "live_feed")

	return func(ctx *gin.Context) {
		clbk := func(api *utils.APIRequest) {
			api.SetDataFromQuery("section", "entries")
			api.SetDataFromQuery("limit", "30")
			api.SetDataFromQuery("view", "masonry")
		}

		handle(ctx, "/entries/live", clbk)
	}
}

func bestHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	handle := feedHandler(mdw, "entries/best", "best_feed")

	return func(ctx *gin.Context) {
		clbk := func(api *utils.APIRequest) {
			api.SetDataFromQuery("category", "month")
			api.SetDataFromQuery("limit", "30")
			api.SetDataFromQuery("view", "masonry")
		}

		handle(ctx, "/entries/best", clbk)
	}
}

func friendsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	handle := feedHandler(mdw, "entries/friends", "friends_feed")

	clbk := func(api *utils.APIRequest) {
		api.SetData("__section", "friends")
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")
	}

	return func(ctx *gin.Context) {
		handle(ctx, "/entries/friends", clbk)
	}
}

func watchingHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	handle := feedHandler(mdw, "entries/friends", "friends_feed")

	clbk := func(api *utils.APIRequest) {
		api.SetData("__section", "watching")
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")
	}

	return func(ctx *gin.Context) {
		handle(ctx, "/entries/watching", clbk)
	}
}

func topsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.QueryCookie()
		api.Forward()
		api.SetScrollHrefs()
		api.SetMe()
		api.WriteTemplate("users/top_users")
	}
}

func tlogHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	handle := feedHandler(mdw, "entries/tlog", "tlog_feed")

	return func(ctx *gin.Context) {
		if _, err := ctx.Request.Cookie("tlog_feed"); err == nil {
			cookie := &http.Cookie{
				Name:   "tlog_feed",
				Value:  "limit=10",
				Path:   "/",
				MaxAge: 60 * 60 * 24 * 90,
			}
			http.SetCookie(ctx.Writer, cookie)
		}

		name := ctx.Param("name")

		clbk := func(api *utils.APIRequest) {
			if !api.IsAjax() {
				api.SetField("profile", "/users/"+name)
			}

			api.SetData("__tlog", true)
		}

		handle(ctx, "/users/"+name+"/tlog", clbk)
	}
}

func favoritesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	handle := feedHandler(mdw, "entries/favorites", "tlog_feed")

	return func(ctx *gin.Context) {
		if _, err := ctx.Request.Cookie("tlog_feed"); err == nil {
			cookie := &http.Cookie{
				Name:   "tlog_feed",
				Value:  "limit=10",
				Path:   "/",
				MaxAge: 60 * 60 * 24 * 90,
			}
			http.SetCookie(ctx.Writer, cookie)
		}

		name := ctx.Param("name")

		clbk := func(api *utils.APIRequest) {
			if !api.IsAjax() {
				api.SetField("profile", "/users/"+name)
			}

			api.SetData("__favorites", true)
		}

		handle(ctx, "/users/"+name+"/favorites", clbk)
	}
}

func usersHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		relation := ctx.Param("relation")
		name := ctx.Param("name")

		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/users/" + name + "/" + relation)
		api.SetScrollHrefs()

		if api.IsAjax() {
			api.WriteTemplate("users/users_page")
		} else {
			api.SetMe()
			api.SetField("profile", "/users/"+name)
			api.WriteTemplate("users/friendlist")
		}
	}
}

func meUsersHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		relation := ctx.Param("relation")

		api.ForwardTo("/me")
		if api.Error() != nil {
			return
		}

		name := api.Data()["name"].(string)
		api.Redirect("/users/" + name + "/relations/" + relation)
	}
}

func meHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		if api.Error() != nil {
			return
		}

		name := api.Data()["name"].(string)
		api.Redirect("/users/" + name)
	}
}

func meSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardTo("PUT", "/me")
		api.Redirect("/me")
	}
}

func avatarSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardToImages("PUT", "/me/avatar")
		api.WriteResponse()
	}
}

func coverSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardToImages("PUT", "/me/cover")
		api.WriteResponse()
	}
}

func designEditorHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/design")
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

func suggestTags(api *utils.APIRequest) {
	api.SetField("suggestedTags", "/me/tags")
	tags := api.Data()["suggestedTags"].(map[string]interface{})
	data, ok := tags["data"].([]interface{})
	if !ok || len(data) == 0 {
		api.SetField("suggestedTags", "/entries/tags")
	}
}

func editorHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetMe()
		suggestTags(api)
		api.WriteTemplate("editor")
	}
}

func postHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/me/tlog")

		entry := api.Data()
		entryID, ok := entry["id"].(json.Number)
		if ok {
			api.ClearData()
			api.SetData("path", "/entries/"+entryID.String())
			api.WriteJson()
		} else {
			api.WriteResponse()
		}
	}
}

func editorExistingHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/entries/" + ctx.Param("id"))
		api.SetMe()
		suggestTags(api)
		api.WriteTemplate("editor")
	}
}

func editPostHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForward("PUT")

		entry := api.Data()
		entryID, ok := entry["id"].(json.Number)
		if ok {
			api.ClearData()
			api.SetData("path", "/entries/"+entryID.String())
			api.WriteJson()
		} else {
			api.WriteResponse()
		}
	}
}

func entryHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		entry := api.Data()
		api.ClearData()
		api.SetData("entry", entry)

		if entry != nil {
			entryID := entry["id"].(json.Number).String()
			cmts, ok := entry["comments"].(map[string]interface{})
			if ok {
				api.SetScrollHrefsWithData("/entries/"+entryID+"/comments", cmts)
			}
		}

		api.SetMe()

		if api.IsAjax() {
			api.WriteTemplate("entries/entry_modal")
		} else {
			api.WriteTemplate("entries/entry")
		}
	}
}

func commentsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		api.SetScrollHrefs()

		api.WriteTemplate("entries/comments_page")
	}
}

func postCommentHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		cmt := api.Data()
		api.ClearData()
		api.SetData("comment", cmt)

		api.WriteTemplate("entries/comment")
	}
}

func editCommentHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForward("PUT")

		cmt := api.Data()
		api.ClearData()
		api.SetData("comment", cmt)

		api.WriteTemplate("entries/comment")
	}
}

func notificationsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		api.WriteTemplate("notifications")
	}
}

func singleNotificationHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		ntf := api.Data()
		api.ClearData()
		api.SetData("ntf", ntf)

		api.WriteTemplate("notification")
	}
}

func imageHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardImages()

		image := api.Data()
		api.ClearData()
		api.SetData("image", image)

		api.WriteTemplate("images/attached")
	}
}

func deleteImageHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardImages()
		api.WriteResponse()
	}
}

func chatHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		if api.IsAjax() {
			chat := api.Data()
			api.ClearData()
			api.SetData("chat", chat)

			api.WriteTemplate("chats/chat")
		} else {
			api.SetMe()
			api.WriteTemplate("chats/chat_page")
		}
	}
}

func chatsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		api.WriteTemplate("chats/chats")
	}
}

func messagesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		api.WriteTemplate("chats/messages")
	}
}

func singleMessageHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		msg := api.Data()
		api.ClearData()
		api.SetData("msg", msg)

		api.WriteTemplate("chats/message")
	}
}

func sendMessageHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		msg := api.Data()
		api.ClearData()
		api.SetData("msg", msg)

		api.WriteTemplate("chats/message")
	}
}

func editMessageHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForward("PUT")

		msg := api.Data()
		api.ClearData()
		api.SetData("msg", msg)

		api.WriteTemplate("chats/message")
	}
}

func proxyHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()
		api.WriteResponse()
	}
}

func proxyNotAuthorizedHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardNotAuthorized()
		api.WriteResponse()
	}
}

func aboutHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("about")
	}
}

func rulesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("rules")
	}
}

func faqHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("faq/faq")
	}
}

func faqMdHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("faq/faq_md")
	}
}

func faqVotesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("faq/faq_votes")
	}
}

func faqInvitesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("faq/faq_invites")
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
