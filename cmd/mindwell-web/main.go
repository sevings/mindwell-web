package main

import (
	"context"
	"encoding/json"
	"github.com/gin-contrib/cors"
	"github.com/sevings/mindwell-web/internal/app/mindwell-web/utils/pongo2"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/patrickmn/go-cache"

	"github.com/sevings/mindwell-web/internal/app/mindwell-web/utils"
)

func main() {
	mdw := utils.NewMindwell()
	pongo2.InitPongo2(mdw)

	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(utils.LogHandler(mdw.LogWeb()))
	router.Use(gin.Recovery())

	web := router.Group("/", hostHandler(mdw.ConfigString("web.domain")))

	web.Static("/assets/", "./web/assets/")

	web.GET("/", rootHandler)
	web.GET("/robots.txt", robotsHandler(mdw))
	web.GET("/sitemap.xml", sitemapHandler(mdw))
	web.GET("/index.html", indexHandler(mdw))

	web.GET("/oauth", oauthFormHandler(mdw))
	web.POST("/oauth/allow", oauthAllowHandler(mdw))
	web.GET("/oauth/deny", oauthDenyHandler(mdw))

	auth := router.Group("/", hostHandler(mdw.ConfigString("auth.domain")))

	withCors := auth.Group("/", corsHandler(mdw))
	withCors.OPTIONS("/login")
	withCors.POST("/login", accountHandler(mdw, false))
	withCors.OPTIONS("/register")
	withCors.POST("/register", accountHandler(mdw, true))

	auth.GET("/blank", blankHandler(mdw))
	auth.GET("/refresh", refreshHandler(mdw))
	auth.GET("/logout", logoutHandler(mdw))

	web.POST("/account/verification", proxyHandler(mdw))
	web.GET("/account/verification/:email", verifyEmailHandler(mdw))

	web.GET("/account/invites", invitesHandler(mdw))

	web.GET("/account/password", passwordHandler(mdw))
	web.POST("/account/password", savePasswordHandler(mdw))

	web.GET("/account/email", emailHandler(mdw))
	web.POST("/account/email", saveEmailHandler(mdw))

	web.GET("/account/ignored", ignoredHandler(mdw))
	web.GET("/account/hidden", hiddenHandler(mdw))

	web.GET("/account/notifications", notificationsSettingsHandler(mdw))
	web.PUT("/account/settings/email", proxyHandler(mdw))
	web.PUT("/account/settings/telegram", proxyHandler(mdw))
	web.PUT("/account/settings/onsite", proxyHandler(mdw))

	web.GET("/account/subscribe/token", proxyHandler(mdw))

	web.GET("/adm", admHandler(mdw))

	web.POST("/adm/grandson", grandsonSaverHandler(mdw))
	web.GET("/adm/grandson/status", proxyHandler(mdw))
	web.POST("/adm/grandson/status", proxyHandler(mdw))

	web.GET("/adm/grandfather/status", proxyHandler(mdw))
	web.POST("/adm/grandfather/status", proxyHandler(mdw))

	web.GET("/wishes/:id", proxyHandler(mdw))
	web.PUT("/wishes/:id", proxyHandler(mdw))
	web.DELETE("/wishes/:id", proxyHandler(mdw))
	web.POST("/wishes/:id/thank", proxyHandler(mdw))

	web.GET("/account/recover", resetPasswordHandler(mdw))
	web.POST("/account/recover", proxyNoKeyHandler(mdw))
	web.POST("/account/recover/password", recoverHandler(mdw))

	web.GET("/live", liveHandler(mdw))
	web.GET("/best", bestHandler(mdw))
	web.GET("/friends", friendsHandler(mdw))
	web.GET("/watching", watchingHandler(mdw))

	web.GET("/users", topsHandler(mdw, "users/top_users"))
	web.GET("/users/:name", tlogHandler(mdw, "/users", false))
	web.GET("/users/:name/tags", proxyNoKeyHandler(mdw))
	web.GET("/users/:name/calendar", proxyNoKeyHandler(mdw))
	web.GET("/users/:name/entries", tlogHandler(mdw, "/users", true))
	web.GET("/users/:name/comments", authorCommentsHandler(mdw, "/users"))
	web.GET("/users/:name/favorites", favoritesHandler(mdw))
	web.GET("/users/:name/images", imagesHandler(mdw, "/users"))
	web.GET("/users/:name/relations/:relation", usersHandler(mdw, "/users"))

	web.GET("/themes", topsHandler(mdw, "users/top_themes"))
	web.GET("/themes/:name", tlogHandler(mdw, "/themes", false))
	web.GET("/themes/:name/tags", proxyNoKeyHandler(mdw))
	web.GET("/themes/:name/calendar", proxyNoKeyHandler(mdw))
	web.GET("/themes/:name/entries", tlogHandler(mdw, "/themes", true))
	web.GET("/themes/:name/comments", authorCommentsHandler(mdw, "/themes"))
	web.GET("/themes/:name/images", imagesHandler(mdw, "/themes"))
	web.GET("/themes/:name/relations/:relation", usersHandler(mdw, "/themes"))

	web.GET("/entries/tags", proxyNoKeyHandler(mdw))

	web.GET("/me", meHandler(mdw, ""))
	web.GET("/me/entries", meHandler(mdw, "/entries"))

	web.POST("/profile/save", meSaverHandler(mdw))
	web.POST("/profile/avatar", avatarSaverHandler(mdw))
	web.POST("/profile/cover", coverSaverHandler(mdw))

	web.POST("/themes", themeCreatorHandler(mdw))
	web.POST("/themes/:name/save", themeSaverHandler(mdw))
	web.POST("/themes/:name/avatar", themeAvatarSaverHandler(mdw))
	web.POST("/themes/:name/cover", themeCoverSaverHandler(mdw))

	web.GET("/design", designEditorHandler(mdw))
	web.POST("/design", designSaverHandler(mdw))

	web.GET("/editor", editorHandler(mdw))
	web.POST("/entries", postHandler(mdw))

	web.GET("/entries/:id/edit", editorExistingHandler(mdw))
	web.POST("/entries/:id", editPostHandler(mdw))

	web.GET("/entries/:id", entryHandler(mdw))
	web.DELETE("/entries/:id", proxyHandler(mdw))

	web.GET("/entries/:id/comments", commentsHandler(mdw))
	web.POST("/entries/:id/comments", postCommentHandler(mdw))

	web.POST("/comments/:id", editCommentHandler(mdw))
	web.DELETE("/comments/:id", proxyHandler(mdw))

	web.PUT("/me/online", proxyHandler(mdw))

	web.PUT("/entries/:id/vote", proxyHandler(mdw))
	web.DELETE("/entries/:id/vote", proxyHandler(mdw))

	web.PUT("/comments/:id/vote", proxyHandler(mdw))
	web.DELETE("/comments/:id/vote", proxyHandler(mdw))

	web.PUT("/entries/:id/watching", proxyHandler(mdw))
	web.DELETE("/entries/:id/watching", proxyHandler(mdw))

	web.PUT("/entries/:id/favorite", proxyHandler(mdw))
	web.DELETE("/entries/:id/favorite", proxyHandler(mdw))

	web.POST("/entries/:id/complain", proxyHandler(mdw))
	web.POST("/comments/:id/complain", proxyHandler(mdw))
	web.POST("/messages/:id/complain", proxyHandler(mdw))
	web.POST("/users/:name/complain", proxyHandler(mdw))
	web.POST("/themes/:name/complain", proxyHandler(mdw))
	web.POST("/wishes/:id/complain", proxyHandler(mdw))

	web.GET("/relations/to/:name", proxyHandler(mdw))
	web.PUT("/relations/to/:name", proxyHandler(mdw))
	web.DELETE("/relations/to/:name", proxyHandler(mdw))

	web.POST("/relations/invited/:name", proxyHandler(mdw))

	web.GET("/relations/from/:name", proxyHandler(mdw))
	web.PUT("/relations/from/:name", proxyHandler(mdw))
	web.DELETE("/relations/from/:name", proxyHandler(mdw))

	web.GET("/notifications", notificationsHandler(mdw))
	web.GET("/notifications/:id", singleNotificationHandler(mdw))
	web.PUT("/notifications/read", proxyHandler(mdw))

	web.POST("/images", imageHandler(mdw))
	web.GET("/images/:id", imageHandler(mdw))
	web.DELETE("/images/:id", deleteImageHandler(mdw))

	web.GET("/chats", chatsHandler(mdw))
	web.GET("/chats/:name", chatHandler(mdw))
	web.PUT("/chats/:name/read", proxyHandler(mdw))

	web.GET("/chats/:name/messages", messagesHandler(mdw))
	web.POST("/chats/:name/messages", sendMessageHandler(mdw))

	web.GET("/messages/:id", singleMessageHandler(mdw))
	web.POST("/messages/:id", editMessageHandler(mdw))
	web.DELETE("/messages/:id", proxyHandler(mdw))

	web.GET("/help/about", aboutHandler(mdw))
	web.GET("/help/rules", rulesHandler(mdw))
	web.GET("/help/faq/", faqHandler(mdw))
	web.GET("/help/faq/md", faqMdHandler(mdw))
	web.GET("/help/faq/votes", faqVotesHandler(mdw))
	web.GET("/help/faq/invites", faqInvitesHandler(mdw))

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

	// Wait for interrupt signal to gracefully shut down the server with
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

func hostHandler(host string) func(ctx *gin.Context) {
	host = strings.ToLower(host)

	return func(ctx *gin.Context) {
		actualHost := ctx.Request.Host
		actualHost = strings.SplitN(actualHost, ":", 2)[0]
		actualHost = strings.ToLower(actualHost)

		if actualHost != host {
			ctx.AbortWithStatus(http.StatusNotFound)
		}
	}
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

	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		_, err := api.Cookie("at")
		if err == nil {
			api.RedirectQuery("/live")
		} else {
			api.SetCsrfToken("/login")
			api.SetCsrfToken("/register")
			api.SetData("__verification", verification)
			api.SetData("__vk_group", vkGroup)

			api.WriteTemplate("index")
		}
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
		api.RedirectToHost(uri + "?code=" + code + "&state=" + state)
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

func blankHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.WriteTemplate("oauth/blank")
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

func setOAuthCookie(api *utils.APIRequest) {
	webDomain := api.Server().ConfigString("web.domain")
	authDomain := api.Server().ConfigString("auth.domain")
	secure := api.Server().ConfigString("web.proto") == "https"

	accessToken := api.Data()["access_token"].(string)
	expiresIn := api.Data()["expires_in"].(json.Number)
	maxAge, err := expiresIn.Int64()
	if err != nil {
		api.Server().LogWeb().Error(err.Error())
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

	refreshReqCookie := http.Cookie{
		Name:     "trr",
		Value:    "n",
		MaxAge:   int(maxAge / 2),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Domain:   webDomain,
		Secure:   secure,
	}
	api.SetCookie(&refreshReqCookie)

	refreshPosCookie := http.Cookie{
		Name:     "trp",
		Value:    "y",
		MaxAge:   60 * 60 * 24 * 30,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Domain:   webDomain,
		Secure:   secure,
	}
	api.SetCookie(&refreshPosCookie)

	refreshToken := api.Data()["refresh_token"].(string)
	refreshCookie := http.Cookie{
		Name:     "rt",
		Value:    refreshToken,
		MaxAge:   60 * 60 * 24 * 30,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Domain:   authDomain,
		Secure:   secure,
	}
	api.SetCookie(&refreshCookie)
}

func accountHandler(mdw *utils.Mindwell, create bool) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		body := api.ReadBody()

		api.CheckCsrfTokenRead()
		if api.Error() != nil {
			api.WriteTemplate("error")
			return
		}

		antibot := api.FormString("antibot")
		name := api.FormString("name")
		if antibot != name+name { // no js, probably bot
			api.ClearData()
			api.SetData("href", "/live")
			api.WriteJson()
			return
		}

		api.SetBody(body)

		if create {
			api.ForwardToNoKey("/account/register")
			if api.Error() != nil {
				api.WriteTemplate("error")
				return
			}
		}

		args := url.Values{
			"grant_type":    {"password"},
			"client_id":     {api.AppID()},
			"client_secret": {api.AppSecret()},
			"username":      {api.FormString("name")},
			"password":      {api.FormString("password")},
		}
		api.SetRequestData(args)

		api.ForwardToNoKey("/oauth2/token")
		if api.Error() != nil {
			api.WriteResponse()
			return
		}

		setOAuthCookie(api)

		to := ctx.Query("to")
		if to == "" {
			if create {
				to = "/me"
			} else {
				to = "/live"
			}
		}

		api.ClearData()
		api.SetData("href", to)
		api.WriteJson()
	}
}

func logoutHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ClearCookieToken()
		api.Redirect("/index.html")
	}
}

func refreshHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		token, err := api.Cookie("rt")
		if err != nil {
			api.ClearCookieToken()
			api.Redirect("/index.html?to=" + api.NextRedirect())
			return
		}

		args := url.Values{
			"grant_type":    {"refresh_token"},
			"client_id":     {api.AppID()},
			"client_secret": {api.AppSecret()},
			"refresh_token": {token.Value},
		}
		api.SetRequestData(args)

		api.MethodForwardTo("POST", "/oauth2/token", true)
		if api.Error() != nil {
			if err, ok := api.Data()["error"].(string); ok {
				mdw.LogWeb().Warn(err)
			}

			api.ClearCookieToken()
			api.SkipError()
			api.Redirect("/index.html?to=" + api.NextRedirect())
			return
		}

		setOAuthCookie(api)

		api.RedirectQuery("/live")
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
		api.SetScrollHrefs()

		if api.IsAjax() {
			api.WriteTemplate("settings/ignored_page")
		} else {
			api.SetMe()
			SetAdm(mdw, ctx, api)
			api.WriteTemplate("settings/ignored")
		}
	}
}

func hiddenHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo("/me/hidden")
		api.SetScrollHrefs()

		if api.IsAjax() {
			api.WriteTemplate("settings/hidden_page")
		} else {
			api.SetMe()
			SetAdm(mdw, ctx, api)
			api.WriteTemplate("settings/hidden")
		}
	}
}

func notificationsSettingsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	bot := mdw.ConfigString("telegram.bot")

	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetMe()
		api.SetField("email", "/account/settings/email")
		api.SetField("telegram", "/account/settings/telegram")
		api.SetField("onsite", "/account/settings/onsite")
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
		api.QueryCookieName("live_feed", "")
		api.ForwardToNoKey("/entries/live")
		api.SetScrollHrefs()

		api.SetDataFromQuery("section", "entries")
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")
		api.SetDataFromQuery("source", "all")

		if ctx.Query("section") != "comments" {
			api.SetData("__search", true)
		}

		if !api.HasUserKey() {
			api.SetCsrfToken("/login")
			api.SetCsrfToken("/register")
		}

		feedHandler(api, "entries/live")
	}
}

func bestHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.QueryCookieName("best_feed", "")
		api.ForwardToNoKey("/entries/best")
		api.SetScrollHrefs()

		api.SetDataFromQuery("category", "month")
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")
		api.SetDataFromQuery("source", "all")
		api.SetData("__search", true)

		if !api.HasUserKey() {
			api.SetCsrfToken("/login")
			api.SetCsrfToken("/register")
		}

		feedHandler(api, "entries/best")
	}
}

func friendsHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.QueryCookieName("friends_feed", "")
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
		api.QueryCookieName("friends_feed", "")
		api.ForwardTo("/entries/watching")
		api.SetScrollHrefs()

		api.SetData("__section", "watching")
		api.SetDataFromQuery("limit", "30")
		api.SetDataFromQuery("view", "masonry")

		feedHandler(api, "entries/friends")
	}
}

func topsHandler(mdw *utils.Mindwell, templateName string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.QueryCookie()
		api.Forward()

		data := api.Data()
		users, ok := data["users"].([]interface{})
		if ok && len(users) == 1 {
			name := users[0].(map[string]interface{})["name"].(string)
			api.Redirect("/users/" + name)
			return
		}

		api.SetScrollHrefs()
		api.SetMe()
		api.WriteTemplate(templateName)
	}
}

func tlogHandler(mdw *utils.Mindwell, baseApiPath string, isTlog bool) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		name := ctx.Param("name")
		api := utils.NewRequest(mdw, ctx)

		var profile interface{}
		if !api.IsAjax() {
			api.SetFieldNoKey("profile", baseApiPath+"/"+name)
			if api.Error() != nil {
				if api.HasUserKey() {
					api.WriteTemplate("error")
				} else {
					ctx.Redirect(http.StatusSeeOther, "/index.html?to="+api.NextRedirect())
				}

				return
			}

			profile = api.Data()["profile"]
			api.ClearData()
		}

		api.QueryCookieName("tlog_feed", "limit=10")

		if isTlog || api.IsLargeScreen() {
			api.ForwardToNoKey(baseApiPath + "/" + name + "/tlog")
			api.SetScrollHrefs()
		}

		if !api.IsAjax() && (!isTlog || api.IsLargeScreen()) {
			limit := api.SetQuery("limit", "100")
			api.SetFieldNoKey("tags", baseApiPath+"/"+name+"/tags")
			api.SetQuery("limit", "9")
			api.SetFieldNoKey("images", baseApiPath+"/"+name+"/images")
			api.SetQuery("limit", limit)

			api.SetFieldNoKey("calendar", baseApiPath+"/"+name+"/calendar")
		}

		api.SkipError()

		api.SetData("profile", profile)
		api.SetData("__feed", isTlog)

		if !api.IsAjax() && !api.HasUserKey() {
			api.SetCsrfToken("/login")
			api.SetCsrfToken("/register")
		}

		feedHandler(api, "entries/tlog")
	}
}

func authorCommentsHandler(mdw *utils.Mindwell, baseApiPath string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		name := ctx.Param("name")
		api := utils.NewRequest(mdw, ctx)

		var profile interface{}
		if !api.IsAjax() {
			api.SetFieldNoKey("profile", baseApiPath+"/"+name)
			if api.Error() != nil {
				if api.HasUserKey() {
					api.WriteTemplate("error")
				} else {
					ctx.Redirect(http.StatusSeeOther, "/index.html?to="+api.NextRedirect())
				}

				return
			}

			profile = api.Data()["profile"]
			api.ClearData()
		}

		api.QueryCookieName("tlog_feed", "limit=10")

		api.ForwardToNoKey(baseApiPath + "/" + name + "/comments")
		api.SetScrollHrefs()

		if !api.IsAjax() && api.IsLargeScreen() {
			limit := api.SetQuery("limit", "100")
			api.SetFieldNoKey("tags", baseApiPath+"/"+name+"/tags")
			api.SetQuery("limit", limit)

			api.SetFieldNoKey("calendar", baseApiPath+"/"+name+"/calendar")
		}

		api.SkipError()

		api.SetData("profile", profile)
		api.SetData("__feed", true)

		if !api.HasUserKey() {
			api.SetCsrfToken("/login")
			api.SetCsrfToken("/register")
		}

		if api.IsAjax() {
			api.WriteTemplate("entries/comment_feed_page")
		} else {
			api.SetMe()
			api.WriteTemplate("entries/tlog_comments")
		}
	}
}

func favoritesHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
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

		api.QueryCookieName("tlog_feed", "limit=10")
		api.ForwardTo("/users/" + name + "/favorites")
		api.SetScrollHrefs()
		api.SkipError()

		api.SetData("profile", profile)
		api.SetData("__feed", true)
		api.SetData("__search", true)

		feedHandler(api, "entries/favorites")
	}
}

func imagesHandler(mdw *utils.Mindwell, baseApiPath string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		name := ctx.Param("name")

		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo(baseApiPath + "/" + name + "/images")
		api.SetScrollHrefs()

		if api.IsAjax() {
			api.WriteTemplate("images/images_page")
		} else {
			api.SetMe()
			api.SetField("profile", baseApiPath+"/"+name)
			api.WriteTemplate("images/profile_images")
		}
	}
}

func usersHandler(mdw *utils.Mindwell, baseApiPath string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		relation := ctx.Param("relation")
		name := ctx.Param("name")

		api := utils.NewRequest(mdw, ctx)
		api.ForwardTo(baseApiPath + "/" + name + "/" + relation)
		api.SetScrollHrefs()

		if api.IsAjax() {
			api.WriteTemplate("users/users_page")
		} else {
			api.SetMe()
			api.SetField("profile", baseApiPath+"/"+name)
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

func themeCreatorHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.Forward()

		if api.Error() != nil {
			api.WriteResponse()
			return
		}

		name, ok := api.Data()["name"].(string)
		if ok {
			api.ClearData()
			api.SetData("path", "/themes/"+name)
			api.WriteJson()
		} else {
			api.WriteResponse()
		}
	}
}

func themeSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		name := ctx.Param("name")
		api.MethodForwardTo("PUT", "/themes/"+name, false)
		api.Redirect("/themes/" + name)
	}
}

func themeAvatarSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		name := ctx.Param("name")
		api.MethodForwardToImages("PUT", "/themes/"+name+"/avatar")
		api.WriteResponse()
	}
}

func themeCoverSaverHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		name := ctx.Param("name")
		api.MethodForwardToImages("PUT", "/themes/"+name+"/cover")
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

func editorHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)
		api.SetMe()

		theme := ctx.Query("theme")
		if len(theme) > 0 {
			api.SetField("theme", "/themes/"+theme)
		}

		api.WriteTemplate("editor")
	}
}

func postHandler(mdw *utils.Mindwell) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		api := utils.NewRequest(mdw, ctx)

		theme := ctx.Query("theme")
		if len(theme) > 0 {
			api.ForwardTo("/themes/" + theme + "/tlog")
		} else {
			api.ForwardTo("/me/tlog")
		}

		entry := api.Data()
		entryID, ok := entry["id"].(json.Number)
		if ok {
			api.ClearData()
			api.SetData("path", "/entries/"+entryID.String())
			api.WriteJson()
		} else if api.StatusCode() == 201 {
			api.ClearData()
			api.SetData("entry", entry)

			if api.IsAjax() {
				api.WriteTemplate("entries/entry_modal")
			} else {
				api.WriteTemplate("entries/entry")
			}
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

			api.SetFieldNoKey("adjacent", "/entries/"+entryID+"/adjacent")
			api.SkipError()

			rights, ok := entry["rights"].(map[string]interface{})
			if ok {
				canComment, ok := rights["comment"].(bool)
				if canComment && ok {
					api.SetField("commentator", "/entries/"+entryID+"/commentator")
				}
			}
		}

		api.SetMe()

		if !api.HasUserKey() {
			api.SetCsrfToken("/login")
			api.SetCsrfToken("/register")
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
