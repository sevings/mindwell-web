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
	dev, err := conf.BoolOr("dev_mode", false)
	if err != nil {
		log.Print(err)
	}

	return &Mindwell{
		DevMode:   dev,
		config:    conf,
		templates: make(map[string]*pongo2.Template),
	}
}

func (m *Mindwell) ConfigString(key string) string {
	value, err := m.config.String(key)
	if err != nil {
		log.Print(err)
	}

	return value
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
