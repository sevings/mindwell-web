package utils

import (
	"log"

	"github.com/flosch/pongo2"
	goconf "github.com/zpatrick/go-config"
)

type Mindwell struct {
	DevMode   bool
	config    *goconf.Config
	templates map[string]*pongo2.Template
	path      string
	host      string
	scheme    string
	url       string
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

func confString(conf *goconf.Config, key string) string {
	value, err := conf.String(key)
	if err != nil {
		log.Print(err)
	}

	return value
}

func NewMindwell() *Mindwell {
	conf := loadConfig("web")

	mode := confString(conf, "mode")
	path := confString(conf, "api.path")
	host := confString(conf, "api.host")
	scheme := confString(conf, "api.scheme")

	return &Mindwell{
		DevMode:   mode == "debug",
		config:    conf,
		templates: make(map[string]*pongo2.Template),
		path:      path,
		host:      host,
		scheme:    scheme,
		url:       scheme + "://" + host + path,
	}
}

func (m *Mindwell) ConfigString(key string) string {
	return confString(m.config, key)
}

func (m *Mindwell) Template(name string) (*pongo2.Template, error) {
	if !m.DevMode {
		if t := m.templates[name]; t != nil {
			return t, nil
		}
	}

	t, err := pongo2.FromFile("web/templates/" + name + ".html")
	if err != nil {
		log.Print(err)
		return t, err
	}

	m.templates[name] = t
	return t, err
}
