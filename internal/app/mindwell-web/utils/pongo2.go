package utils

import (
	"errors"
	"log"
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
