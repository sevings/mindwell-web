String.prototype.shuffle = function () {
    var words = this.split(" ")

    for(var w = 0; w < words.length; w++) {
        var a = Array.from(words[w])
        var n = a.length

        if(n < 4)
            continue

        var count = Math.floor((n - 2) / 4)
        if(!count)
            count = 1

        for(var i = 0; i < count; i++) {
            var j = Math.floor(Math.random() * (n - 3)) + 1
            var tmp = a[j]
            a[j] = a[j+1]
            a[j+1] = tmp
        }

        words[w] = a.join("")
    }

    return words.join(" ")
}

var memoize = new Map()

function shuffleContent() {
    var el = $(this)
    var src = el.text()
    var text = memoize.get(src)
    if(!text) {
        text = src.shuffle()
        memoize.set(src, text)
    }
    el.text(text)
}

$(".showname").each(shuffleContent)
