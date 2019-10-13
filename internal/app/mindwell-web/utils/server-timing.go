package utils

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Metric struct {
	Name  string
	begin int64
	end   int64
}

func (m *Metric) Start() *Metric {
	m.begin = time.Now().UnixNano()
	return m
}

func (m *Metric) Stop() *Metric {
	m.end = time.Now().UnixNano()
	return m
}

func (m *Metric) String() string {
	if m.begin == 0 {
		return m.Name
	}

	if m.end == 0 {
		m.Stop()
	}

	dur := float64(m.end-m.begin) / 1000000
	return fmt.Sprintf("%s;dur=%.2f", m.Name, dur)
}

type ServerTiming struct {
	metrics []Metric
}

func NewServerTiming() *ServerTiming {
	return &ServerTiming{
		metrics: make([]Metric, 0, 5),
	}
}

func (st *ServerTiming) Add(name string) *Metric {
	st.metrics = append(st.metrics, Metric{Name: name})
	return &st.metrics[len(st.metrics)-1]
}

func (st ServerTiming) String() string {
	values := make([]string, 0, len(st.metrics))
	for _, m := range st.metrics {
		values = append(values, m.String())
	}

	return strings.Join(values, ", ")
}

func (st ServerTiming) WriteHeader(w http.ResponseWriter) {
	w.Header().Set("Server-Timing", st.String())
}
