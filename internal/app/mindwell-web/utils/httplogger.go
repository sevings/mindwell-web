package utils

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"time"
)

func LogHandler(logger *zap.Logger) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		start := time.Now()

		ctx.Next()

		token := ctx.GetHeader("X-User-Key")
		if token == "" {
			token, _ = ctx.Cookie("api_token")
		}

		logger.Info("http",
			zap.String("method", ctx.Request.Method),
			zap.String("url", ctx.Request.RequestURI),
			zap.String("referrer", ctx.Request.Referer()),
			zap.String("user_agent", ctx.Request.UserAgent()),
			zap.String("api_key", token),
			zap.String("ip", ctx.GetHeader("X-Forwarded-For")),
			zap.Int64("request_size", ctx.Request.ContentLength),
			zap.Int("status", ctx.Writer.Status()),
			zap.Int("reply_size", ctx.Writer.Size()),
			zap.Int64("duration", time.Since(start).Microseconds()),
		)
	}
}
