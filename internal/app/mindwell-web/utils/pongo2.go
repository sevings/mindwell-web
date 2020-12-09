package utils

import (
	"errors"
	"github.com/sevings/mindwell-web/internal/app/mindwell-web/utils/embedder"
	"log"
	"regexp"
	"strconv"
	"strings"

	"github.com/flosch/pongo2"
	"github.com/sevings/mindwell-server/utils"
)

func init() {
	registerFilter("quantity", quantity)
	registerFilter("gender", gender)
	registerFilter("media", media)
	registerFilter("cut_html", cutHtml)
	registerFilter("cut_text", cutText)
}

func registerFilter(name string, filter pongo2.FilterFunction) {
	err := pongo2.RegisterFilter(name, filter)
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
func gender(gender *pongo2.Value, _ *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if gender.IsNil() {
		return gender, nil
	}

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

var imgSrcRe = regexp.MustCompile(`(?i)<img[^>]+src="([^"]+)"[^>]*>`)
var emb = embedder.NewEmbedder()

// usage: {{ html|media:"embed" }}
func media(content *pongo2.Value, param *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if content.IsNil() {
		return content, nil
	}

	if !content.IsString() {
		return nil, &pongo2.Error{
			Sender:    "filter:media",
			OrigError: errors.New("input value is not a string"),
		}
	}

	embed := param.String() == "embed"

	html := content.String()

	if embed {
		html = imgSrcRe.ReplaceAllString(html, `<a href="$1" target="__blank" class="js-zoom-image">$0</a>`)
	}

	html = emb.ReplaceAll(html, embed)

	return pongo2.AsSafeValue(html), nil
}

func cutHtml(content *pongo2.Value, param *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if content.IsNil() {
		return content, nil
	}

	if !content.IsString() {
		return nil, &pongo2.Error{
			Sender:    "filter:cut_html",
			OrigError: errors.New("input value is not a string"),
		}
	}

	if !param.IsString() {
		return nil, &pongo2.Error{
			Sender:    "filter:cut_html",
			OrigError: errors.New("parameter is not an string"),
		}
	}

	lenLines := strings.Split(param.String(), "x")
	if len(lenLines) < 2 {
		return nil, &pongo2.Error{
			Sender:    "filter:cut_html",
			OrigError: errors.New("expected two numbers"),
		}
	}

	maxLineLen, err := strconv.Atoi(lenLines[0])
	if err != nil {
		return nil, &pongo2.Error{
			Sender:    "filter:cut_html",
			OrigError: err,
		}
	}

	maxLineCount, err := strconv.Atoi(lenLines[1])
	if err != nil {
		return nil, &pongo2.Error{
			Sender:    "filter:cut_html",
			OrigError: err,
		}
	}

	html := content.String()
	html, _ = utils.CutHtml(html, maxLineCount, maxLineLen)

	return pongo2.AsSafeValue(html), nil
}

func cutText(content *pongo2.Value, param *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if content.IsNil() {
		return content, nil
	}

	if !content.IsString() {
		return nil, &pongo2.Error{
			Sender:    "filter:cut_text",
			OrigError: errors.New("input value is not a string"),
		}
	}

	if !param.IsInteger() {
		return nil, &pongo2.Error{
			Sender:    "filter:cut_text",
			OrigError: errors.New("parameter is not an integer"),
		}
	}

	text := content.String()
	text = utils.RemoveHTML(text)

	maxLength := param.Integer()
	text, _ = utils.CutText(text, maxLength)

	return pongo2.AsSafeValue(text), nil
}
