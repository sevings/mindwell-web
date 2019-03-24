package utils

import (
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/flosch/pongo2"
)

func init() {
	err := pongo2.RegisterFilter("quantity", pongo2.FilterFunction(quantity))
	if err != nil {
		log.Println(err)
	}

	err = pongo2.RegisterFilter("gender", pongo2.FilterFunction(gender))
	if err != nil {
		log.Println(err)
	}

	err = pongo2.RegisterFilter("media", pongo2.FilterFunction(media))
	if err != nil {
		log.Println(err)
	}
}

// usage: {{ num }} слон{{ num|quantity:",а,ов" }}
func quantity(num *pongo2.Value, end *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if !end.IsString() {
		return nil, &pongo2.Error{
			Sender:    "filter:quantity",
			OrigError: errors.New("parameter is not a string"),
		}
	}

	ends := strings.Split(end.String(), ",")
	if len(ends) < 3 {
		return nil, &pongo2.Error{
			Sender:    "filter:quantity",
			OrigError: errors.New("parameter must contain three comma-separated strings"),
		}
	}

	qty := num.Integer()

	switch {
	case qty%10 == 1 && qty%100 != 11:
		return pongo2.AsSafeValue(ends[0]), nil
	case (qty%10 > 1 && qty%10 < 5) && (qty%100 < 10 || qty%100 > 20):
		return pongo2.AsSafeValue(ends[1]), nil
	default:
		return pongo2.AsSafeValue(ends[2]), nil
	}
}

// usage: сделал{{ profile.gender|gender }}
func gender(gender *pongo2.Value, param *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if !gender.IsString() {
		return nil, &pongo2.Error{
			Sender:    "filter:gender",
			OrigError: errors.New("input value is not a string"),
		}
	}
	g := gender.String()

	var ending string
	if g == "female" {
		ending = "а"
	}

	return pongo2.AsSafeValue(ending), nil
}

var aRe = regexp.MustCompile(`(?i)<a[^>]+>[^<]*</a>`)
var hrefRe = regexp.MustCompile(`(?i)<a[^>]+href="([^"]+)"[^>]*>([^<]*)</a>`)
var ytRe = regexp.MustCompile(`(?i)(?:https?://)?(?:www\.)?(?:m\.)?(?:youtube.com/watch\?.*v=|youtu.be/)([a-z0-9\-_]+).*`)

func convertMediaTag(tag string) string {
	ht := hrefRe.FindAllStringSubmatch(tag, -1)
	if len(ht) == 0 {
		return tag
	}

	href := ht[0][1]
	text := ht[0][2]

	if len(text) > 0 && href[:20] != text[:20] {
		return tag
	}

	yt := ytRe.FindAllStringSubmatch(href, -1)
	if len(yt) > 0 {
		id := yt[0][1]
		return fmt.Sprintf(`<iframe class="yt-video" type="text/html" frameborder="0" width="480" height="270" src="https://www.youtube.com/embed/%s?enablejsapi=1" allowfullscreen></iframe>`, id)
	}

	return tag
}

// usage: {{ html|media }}
func media(content *pongo2.Value, param *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if !content.IsString() {
		return nil, &pongo2.Error{
			Sender:    "filter:media",
			OrigError: errors.New("input value is not a string"),
		}
	}

	html := content.String()
	html = aRe.ReplaceAllStringFunc(html, convertMediaTag)

	return pongo2.AsSafeValue(html), nil
}
