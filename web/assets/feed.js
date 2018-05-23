function vote(id, positive) {
    var req = new XMLHttpRequest()
    req.open('PUT', '/entries/' + id + '/vote?positive=' + positive, true)
    req.onreadystatechange = updateRating
    req.send()

    var post = document.getElementById('post' + id)
    var up = post.getElementsByClassName('up_vote').item(0)
    var down = post.getElementsByClassName('down_vote').item(0)
    up.disabled = down.disabled = true

    function updateRating() {
        if(req.readyState != XMLHttpRequest.DONE)
            return

        var resp = JSON.parse(req.responseText)
        if(req.status != 200) {
            alert(resp.message)
            var status = post.data.vote
            up.disabled = (status == 'pos')
            down.disabled = (status == 'neg')
            return
        }

        up.disabled = positive
        down.disabled = !positive

        var rating = post.getElementsByClassName('rating').item(0)

        var count = (resp.votes || 0)
        rating.innerHTML = (count > 0 ? '+' + count : count)

        var rate = (resp.rating || 0)
        rating.setAttribute("title", "Рейтинг: " + Math.round(rate))
    }
}

function deletePost(id) {
    if(!confirm("Пост будет удален навсегда."))
        return

    var req = new XMLHttpRequest()
    req.open('DELETE', '/entries/' + id, true)
    req.onreadystatechange = onReadyStateChange
    req.send()

    function onReadyStateChange() {
        if(req.readyState != XMLHttpRequest.DONE)
            return

        if(req.status != 200) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
            return
        }

        if(document.location.pathname == "/entries/" + id)
            document.location.assign("/me")
        else {
            var date = document.getElementById("post-date" + id)
            date.remove()

            var post = document.getElementById("post" + id)
            post.remove()
        }
    }
}

function editPost(id) {
    document.location.assign("/entries/" + id + "/edit")
}

function loadComments(href) {
    $.ajax({
        url: href,
        success: function(data) {
            $("a.next").remove()
            $("#comments").prepend(data)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
    })
}

function loadFeed(href) {
    $.ajax({
        url: href,
        success: function(data) {
            $("a.btn-more").remove()

            var template = document.createElement('template');
            template.innerHTML = data;
            var feed = template.content.childNodes;
            formatTimeElements(feed)

            $("#feed").append(feed)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
    })
}

$("#comment-editor").ajaxForm({
    resetForm: true,
    success: function(data) {
        $("#comments").append(data)
    },
    error: function(data) {
        alert(data)
    },
})
