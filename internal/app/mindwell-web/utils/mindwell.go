package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"go.uber.org/zap"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
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
	uidSalt   string
	apiID     string
	apiSecret string
	appToken  string
	appTokThr time.Time
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
	m.uidSalt = m.ConfigString("web.uid2_salt")
	m.apiID = strconv.Itoa(m.ConfigInt("api.client_id"))
	m.apiSecret = m.ConfigString("api.client_secret")
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

type appToken struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int64  `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

func (m *Mindwell) AppToken() string {
	if m.appTokThr.After(time.Now()) {
		return m.appToken
	}

	args := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {m.apiID},
		"client_secret": {m.apiSecret},
	}
	body := ioutil.NopCloser(strings.NewReader(args.Encode()))

	req, err := http.NewRequest(http.MethodPost, m.url+"/oauth2/token", body)
	if err != nil {
		m.LogSystem().Error(err.Error())
		return ""
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "MindwellWeb")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		m.LogSystem().Error(err.Error())
		return ""
	}

	defer resp.Body.Close()
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		m.LogSystem().Error(err.Error())
		return ""
	}

	if resp.StatusCode != 200 {
		m.LogSystem().Error(string(data))
		return ""
	}

	var tok appToken
	err = json.Unmarshal(data, &tok)
	if err != nil {
		m.LogSystem().Error(err.Error())
		return ""
	}

	if tok.TokenType != "bearer" {
		m.LogSystem().Error(string(data))
		return ""
	}

	m.appToken = tok.AccessToken
	m.appTokThr = time.Now().Add(time.Duration(tok.ExpiresIn) * time.Second)

	m.LogSystem().Info(tok.AccessToken)

	return m.appToken
}

func (m *Mindwell) Uid2(accessToken string) string {
	salt := m.ConfigString("web.uid2_salt")
	user := strings.SplitN(accessToken, ".", 2)[0]
	sum := sha256.Sum256([]byte(user + salt))
	return hex.EncodeToString(sum[:8])
}
