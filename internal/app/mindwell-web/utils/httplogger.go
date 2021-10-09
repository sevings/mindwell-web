package utils

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"strings"
	"time"
)

func LogHandler(logger *zap.Logger) gin.HandlerFunc {
	idBuilder := NewDefaultBrowserIDBuilder()

	return func(ctx *gin.Context) {
		start := time.Now()

		ctx.Next()

		user, _ := ctx.Cookie("at")
		user = strings.SplitN(user, ".", 2)[0]

		dev, _ := ctx.Cookie("dev")
		uid, _ := ctx.Cookie("uid")

		logger.Info("http",
			zap.String("method", ctx.Request.Method),
			zap.String("url", ctx.Request.RequestURI),
			zap.String("referrer", ctx.Request.Referer()),
			zap.String("browser", idBuilder.Build(ctx.Request).String()),
			zap.String("user_agent", ctx.Request.UserAgent()),
			zap.String("uid", uid),
			zap.String("dev", dev),
			zap.String("user", user),
			zap.String("ip", ctx.GetHeader("X-Forwarded-For")),
			zap.Int64("request_size", ctx.Request.ContentLength),
			zap.Int("status", ctx.Writer.Status()),
			zap.Int("reply_size", ctx.Writer.Size()),
			zap.Int64("duration", time.Since(start).Microseconds()),
		)
	}
}
