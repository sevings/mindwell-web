package main

import (
	"context"
	"encoding/json"
	"github.com/gin-contrib/cors"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/patrickmn/go-cache"

	"github.com/sevings/mindwell-web/internal/app/mindwell-web/utils"
)

func main() {
	mdw := utils.NewMindwell()
	utils.InitPongo2(mdw)

	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(utils.LogHandler(mdw.LogWeb()))
	router.Use(gin.Recovery())

	router.Static("/assets/", "./web/assets/")

	router.GET("/", rootHandler)
	router.GET("/robots.txt", robotsHandler(mdw))
	router.GET("/sitemap.xml", sitemapHandler(mdw))
	router.GET("/index.html", indexHandler(mdw))

	router.GET("/blank", blankHandler(mdw))
	router.GET("/oauth", oauthFormHandler(mdw))
	router.POST("/oauth/allow", oauthAllowHandler(mdw))
	router.GET("/oauth/deny", oauthDenyHandler(mdw))

	noJs := router.Group("/nojs", corsHandler(mdw))
	noJs.OPTIONS("/login")
	noJs.POST("/login", loginHandler(mdw))

	router.GET("/account/logout", logoutHandler(mdw))
	//router.POST("/account/register", accountHandler(mdw, "/me/entries"))

	router.POST("/account/verification", proxyHandler(mdw))
	router.GET("/account/verification/:email", verifyEmailHandler(mdw))

	router.GET("/account/invites", invitesHandler(mdw))

	router.GET("/account/password", passwordHandler(mdw))
	router.POST("/account/password", savePasswordHandler(mdw))

	router.GET("/account/email", emailHandler(mdw))
	router.POST("/account/email", saveEmailHandler(mdw))

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
	router.POST("/account/recover", proxyNoKeyHandler(mdw))
	router.POST("/account/recover/password", recoverHandler(mdw))

	router.GET("/live", liveHandler(mdw))
	router.GET("/best", bestHandler(mdw))
	router.GET("/friends", friendsHandler(mdw))
	router.GET("/watching", watchingHandler(mdw))

	router.GET("/users", topsHandler(mdw))
	router.GET("/users/:name", tlogHandler(mdw, false))
	router.GET("/users/:name/calendar", proxyNoKeyHandler(mdw))
	router.GET("/users/:name/entries", tlogHandler(mdw, true))
	router.GET("/users/:name/favorites", favoritesHandler(mdw))
	router.GET("/users/:name/relations/:relation", usersHandler(mdw))

	router.GET("/me", meHandler(mdw, ""))
	router.GET("/me/entries", meHandler(mdw, "/entries"))

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

	addr := mdw.ConfigString("web.listen_address")
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

func robotsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		ctx.Header("Content-Type", "text/plain")
		api.WriteTemplateWithExtension("seo/robots.txt")
	}
}

func sitemapHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		ctx.Header("Content-Type", "application/xml")
		api.WriteTemplateWithExtension("seo/sitemap.xml")
	}
}

func indexHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	verification := mdw.ConfigString("web.verification")
	vkGroup := mdw.ConfigInt("vk.group")
	nojsUrl := mdw.ConfigString("nojs.proto") + "://" + mdw.ConfigString("nojs.domain")

	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		_, err := ctx.Request.Cookie("api_token")
		if err == nil {
			to, err := url.QueryUnescape(ctx.Query("to"))
			if to == "" || err != nil {
				to = "/live"
			}

			ctx.Redirect(http.StatusSeeOther, to)
		} else {
			api.SetCsrfToken("/nojs/login")
			api.SetCsrfToken("/nojs/register")
			api.SetData("__verification", verification)
			api.SetData("__vk_group", vkGroup)
			api.SetData("__nojs_url", nojsUrl)
			api.WriteTemplate("index")
		}
	}
}

func blankHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("oauth/blank")
	}
}

var authCache = cache.New(15*time.Minute, time.Hour)

func oauthFormHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetMe()

		appID := ctx.Query("client_id")
		api.SetField("app", "/oauth2/apps/"+appID)

		if api.Error() != nil {
			api.WriteTemplate("error")
			return
		}

		uri := ctx.Query("redirect_uri")
		authCache.SetDefault(appID, uri)

		api.SetDataFromQuery("client_id", "")
		api.SetDataFromQuery("response_type", "")
		api.SetDataFromQuery("redirect_uri", "")
		api.SetDataFromQuery("state", "")
		api.SetDataFromQuery("code_challenge", "")
		api.SetDataFromQuery("code_challenge_method", "")

		scope := ctx.QueryArray("scope")
		api.SetData("__scope", scope)

		api.SetCsrfToken("/oauth/allow")
		api.WriteTemplate("oauth/auth")
	}
}

func handleOAuth(ctx *gin.Context, api *utils.APIRequest) {
	appID := ctx.Query("client_id")
	redirect, ok := authCache.Get(appID)
	if !ok {
		api.WriteTemplate("error")
		return
	}
	uri := redirect.(string)

	if api.StatusCode() == 200 {
		code := api.Data()["code"].(string)
		state := api.Data()["state"].(string)
		api.Redirect(uri + "?code=" + code + "&state=" + state)
	} else if api.StatusCode() == 400 {
		api.SkipError()
		errType := api.Data()["error"].(string)
		if errType == "invalid_redirect" || errType == "unrecognized_client" {
			api.WriteTemplate("error")
		} else {
			ctx.Redirect(http.StatusSeeOther, uri+"?error="+errType)
		}
	} else {
		api.WriteTemplate("error")
	}
}

func oauthAllowHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		api.CheckCsrfToken()
		if api.Error() != nil {
			api.WriteTemplate("error")
			return
		}

		api.ForwardTo("/oauth2/allow")

		handleOAuth(ctx, api)
	}
}

func oauthDenyHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/oauth2/deny")

		handleOAuth(ctx, api)
	}
}

func logoutHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ClearCookieToken()
		ctx.Redirect(http.StatusSeeOther, "/index.html")
	}
}
func corsHandler(mdw *utils.Mindwell) gin.HandlerFunc {
	webUrl := mdw.ConfigString("web.proto") + "://" + mdw.ConfigString("web.domain")

	config := cors.DefaultConfig()
	config.AllowCredentials = true
	config.AllowOrigins = []string{webUrl}
	config.AllowMethods = []string{"POST"}
	config.AllowHeaders = []string{"X-Error-Type"}

	return cors.New(config)
}

func loginHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	clientID := mdw.ConfigInt("api.client_id")
	clientSecret := mdw.ConfigString("api.client_secret")
	webDomain := mdw.ConfigString("web.domain")
	nojsDomain := mdw.ConfigString("nojs.domain")
	secure := mdw.ConfigString("web.proto") == "https"

	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		api.CheckCsrfToken()
		if api.Error() != nil {
			api.WriteTemplate("error")
			return
		}

		args := url.Values{
			"grant_type":    {"password"},
			"client_id":     {strconv.Itoa(clientID)},
			"client_secret": {clientSecret},
			"username":      {api.FormString("name")},
			"password":      {api.FormString("password")},
		}
		api.SetRequestData(args)

		api.ForwardToNoKey("/oauth2/token")
		if api.Error() != nil {
			api.WriteResponse()
			return
		}

		accessToken := api.Data()["access_token"].(string)
		expiresIn := api.Data()["expires_in"].(json.Number)
		maxAge, err := expiresIn.Int64()
		if err != nil {
			mdw.LogWeb().Error(err.Error())
		}
		accessCookie := http.Cookie{
			Name:     "at",
			Value:    accessToken,
			MaxAge:   int(maxAge),
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
			Domain:   webDomain,
			Secure:   secure,
		}
		api.SetCookie(&accessCookie)

		refreshToken := api.Data()["refresh_token"].(string)
		refreshCookie := http.Cookie{
			Name:     "rt",
			Value:    refreshToken,
			MaxAge:   60 * 60 * 24 * 30,
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
			Domain:   nojsDomain,
			Secure:   secure,
		}
		api.SetCookie(&refreshCookie)

		api.ClearData()
		api.SetData("path", "/live")
		api.WriteJson()
	}
}

func verifyEmailHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardNoKey()
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
		api.SetCsrfToken("/account/password")
		api.WriteTemplate("settings/password")
	}
}

func savePasswordHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		api.CheckCsrfToken()
		if api.Error() != nil {
			api.WriteTemplate("error")
			return
		}

		api.Forward()
		api.WriteResponse()
	}
}

func emailHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetMe()
		SetAdm(mdw, ctx, api)
		api.SetCsrfToken("/account/email")
		api.WriteTemplate("settings/email")
	}
}

func saveEmailHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		api.CheckCsrfToken()
		if api.Error() != nil {
			api.WriteTemplate("error")
			return
		}

		api.Forward()
		api.WriteResponse()
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
		api.ForwardNoKey()
		api.WriteResponse()
	}
}

func feedHandler(api *utils.APIRequest, templateName string) {
	api.SetDataFromQuery("tag", "")
	api.SetDataFromQuery("sort", "")
	api.SetDataFromQuery("query", "")

	if api.IsAjax() {
		view, ok := api.Data()["__view"].(string)
		if ok && view == "masonry" {
			api.WriteTemplate("entries/feed_page")
		} else {
			api.WriteTemplate("entries/tlog_page")
		}
	} else {
		api.SetMe()
		api.WriteTemplate(templateName)
	}
}

func liveHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.QueryCookieName("live_feed")
		api.ForwardTo("/entries/live")
		api.SetScrollHrefs()

		api.SetDataFromQuery("section", "entries")
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")

		if ctx.Query("section") != "comments" {
			api.SetData("__search", true)
		}

		feedHandler(api, "entries/live")
	}
}

func bestHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.QueryCookieName("best_feed")
		api.ForwardTo("/entries/best")
		api.SetScrollHrefs()

		api.SetDataFromQuery("category", "month")
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")
		api.SetData("__search", true)

		feedHandler(api, "entries/best")
	}
}

func friendsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.QueryCookieName("friends_feed")
		api.ForwardTo("/entries/friends")
		api.SetScrollHrefs()

		api.SetData("__section", "friends")
		api.SetData("__search", true)
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")

		feedHandler(api, "entries/friends")
	}
}

func watchingHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.QueryCookieName("friends_feed")
		api.ForwardTo("/entries/watching")
		api.SetScrollHrefs()

		api.SetData("__section", "watching")
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")

		feedHandler(api, "entries/friends")
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

func tlogHandler(mdw *utils.Mindwell, isTlog bool) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		if _, err := ctx.Request.Cookie("tlog_feed"); err == nil {
			cookie := &http.Cookie{
				Name:     "tlog_feed",
				Value:    "limit=10",
				Path:     "/",
				MaxAge:   60 * 60 * 24 * 90,
				SameSite: http.SameSiteLaxMode,
			}
			http.SetCookie(ctx.Writer, cookie)
		}

		name := ctx.Param("name")
		api := utils.NewRequest(mdw, ctx)
		var profile interface{}

		if !api.IsAjax() {
			api.SetFieldNoKey("profile", "/users/"+name)
			if api.Error() != nil {
				api.WriteTemplate("error")
				return
			}

			profile = api.Data()["profile"]
			api.ClearData()
		}

		if isTlog || api.IsLargeScreen() {
			api.QueryCookieName("tlog_feed")
			api.ForwardToNoKey("/users/" + name + "/tlog")
			api.SetScrollHrefs()
		}

		if !isTlog || api.IsLargeScreen() {
			api.SetFieldNoKey("tags", "/users/"+name+"/tags")
		}

		api.SkipError()

		api.SetData("profile", profile)
		api.SetData("__feed", isTlog)

		if !api.HasUserKey() {
			api.SetCsrfToken("/account/login")
			api.SetCsrfToken("/account/register")
		}

		feedHandler(api, "entries/tlog")
	}
}

func favoritesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		if _, err := ctx.Request.Cookie("tlog_feed"); err == nil {
			cookie := &http.Cookie{
				Name:     "tlog_feed",
				Value:    "limit=10",
				Path:     "/",
				MaxAge:   60 * 60 * 24 * 90,
				SameSite: http.SameSiteLaxMode,
			}
			http.SetCookie(ctx.Writer, cookie)
		}

		name := ctx.Param("name")
		api := utils.NewRequest(mdw, ctx)
		var profile interface{}

		if !api.IsAjax() {
			api.SetFieldNoKey("profile", "/users/"+name)
			if api.Error() != nil {
				api.WriteTemplate("error")
				return
			}

			profile = api.Data()["profile"]
			api.ClearData()
		}

		api.QueryCookieName("tlog_feed")
		api.ForwardTo("/users/" + name + "/favorites")
		api.SetScrollHrefs()
		api.SkipError()

		api.SetData("profile", profile)
		api.SetData("__feed", true)
		api.SetData("__search", true)

		feedHandler(api, "entries/favorites")
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

func meHandler(mdw *utils.Mindwell, subpath string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/me")

		if api.Error() != nil {
			api.WriteTemplate("error")
			return
		}

		name := api.Data()["name"].(string)
		api.Redirect("/users/" + name + subpath)
	}
}

func meSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.MethodForwardTo("PUT", "/me", false)
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
		api.MethodForwardTo("PUT", "/design", false)
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
		api.ForwardNoKey()

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

		if !api.HasUserKey() {
			api.SetCsrfToken("/account/login")
			api.SetCsrfToken("/account/register")
		}

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
			name := ctx.Param("name")
			api.SetField("messages", "/chats/"+name+"/messages")
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

func proxyNoKeyHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardNoKey()
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
