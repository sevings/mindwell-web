package utils

import (
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"go.uber.org/zap"
	"log"
	"time"

	"github.com/flosch/pongo2"
	goconf "github.com/zpatrick/go-config"
)

type Mindwell struct {
	DevMode   bool
	config    *goconf.Config
	templates map[string]*pongo2.Template
	log       *zap.Logger
	path      string
	host      string
	scheme    string
	url       string
	imgHost   string
	imgUrl    string
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

func NewMindwell() *Mindwell {
	conf := loadConfig("web")

	m := &Mindwell{
		config:    conf,
		templates: make(map[string]*pongo2.Template),
	}

	m.installLogger()

	m.path = m.ConfigString("api.path")
	m.host = m.ConfigString("api.host")
	m.scheme = m.ConfigString("api.scheme")
	m.url = m.scheme + "://" + m.host + m.path
	m.imgHost = m.ConfigString("images.host")
	m.imgUrl = m.scheme + "://" + m.imgHost + m.path

	return m
}

func (m *Mindwell) installLogger() {
	m.DevMode = m.ConfigString("mode") == "debug"

	var err error

	if m.DevMode {
		m.log, err = zap.NewDevelopment(zap.WithCaller(false))
	} else {
		m.log, err = zap.NewProduction(zap.WithCaller(false))
	}

	if err != nil {
		log.Fatal(err)
	}

	_, err = zap.RedirectStdLogAt(m.LogSystem(), zap.ErrorLevel)
	if err != nil {
		m.LogSystem().Error(err.Error())
	}
}

func (m *Mindwell) ConfigString(key string) string {
	value, err := m.config.String(key)
	if err != nil {
		m.LogSystem().Warn(err.Error())
	}

	return value
}

func (m *Mindwell) ConfigBytes(key string) []byte {
	return []byte(m.ConfigString(key))
}

func (m *Mindwell) ConfigBool(key string) bool {
	value, err := m.config.Bool(key)
	if err != nil {
		m.LogSystem().Warn(err.Error())
	}

	return value
}

func (m *Mindwell) ConfigInt(key string) int {
	value, err := m.config.Int(key)
	if err != nil {
		m.LogSystem().Warn(err.Error())
	}

	return value
}

func (m *Mindwell) Template(name string) (*pongo2.Template, error) {
	return m.TemplateWithExtension(name + ".html")
}

func (m *Mindwell) TemplateWithExtension(name string) (*pongo2.Template, error) {
	if !m.DevMode {
		if t := m.templates[name]; t != nil {
			return t, nil
		}
	}

	t, err := pongo2.FromFile("web/templates/" + name)
	if err != nil {
		m.LogSystem().Error(err.Error())
		return t, err
	}

	m.templates[name] = t
	return t, err
}

func (m *Mindwell) LogWeb() *zap.Logger {
	return m.log.With(zap.String("type", "web"))
}

func (m *Mindwell) LogSystem() *zap.Logger {
	return m.log.With(zap.String("type", "system"))
}

func (m *Mindwell) CreateCsrfToken(action, client string) string {
	now := time.Now().Unix()
	exp := now + 60*60*3

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iat": now,
		"exp": exp,
		"act": action,
		"ip":  client,
	})

	secret := m.ConfigBytes("web.csrf_secret")
	tokenString, err := token.SignedString(secret)
	if err != nil {
		m.LogSystem().Error(err.Error())
	}

	return tokenString
}

func (m *Mindwell) CheckCsrfToken(tokenString, action, client string) error {
	secret := m.ConfigBytes("web.csrf_secret")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		return secret, nil
	})

	if err != nil {
		return err
	}

	if !token.Valid {
		return fmt.Errorf("Invalid token: %s\n", tokenString)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims.Valid() != nil {
		return fmt.Errorf("Error get claims: %s\n", tokenString)
	}

	act, ok := claims["act"].(string)
	if !ok || act != action {
		return fmt.Errorf("Action mismatch: expected %s, got %s\n", action, act)
	}

	cli, ok := claims["ip"].(string)
	if !ok || cli != client {
		return fmt.Errorf("Client mismatch: expected %s, got %s\n", client, cli)
	}

	return nil
}
