$("a.post-down").click(function() {
    vote($(this), false)
    return false
})

$("a.post-up").click(function() {
    vote($(this), true)
    return false
})

function vote(counter, positive) {
    var info = counter.parents(".post")
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    var vote = info.data("vote")
    var delVote = ((positive && vote == "pos") || (!positive && vote == "neg"))

    $.ajax({
        url: "/entries/" + id + "/vote?positive=" + positive,
        method: delVote ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            info.data("vote", resp.vote)

            var upLink = info.find(".post-up")
            var downLink = info.find(".post-down")
            var span = info.find(".post-rating")

            var upCount = (resp.upCount || 0)
            var downCount = (resp.downCount || 0)
            span.text(upCount - downCount)
            
            var title = upCount + " за, " + downCount + " против.\nРейтинг: " + Math.round(resp.rating || 0)
            upLink.attr("title", title)
            downLink.attr("title", title)
            span.attr("title", title)

            var up = resp.vote == "pos"
            upLink.find("[data-fa-i2svg]")
                .toggleClass("far", !up)
                .toggleClass("fas", up)

            var down = resp.vote == "neg"
            downLink.find("[data-fa-i2svg]")
                .toggleClass("far", !down)
                .toggleClass("fas", down)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            info.data("enabled", true)
        },
    })
}

function deletePost(id) {
    if(!confirm("Пост будет удален навсегда."))
        return false

    $.ajax({
        url: "/entries/" + id,
        method: "DELETE",
        success: function(resp) {
            if(document.location.pathname == "/entries/" + id)
                window.history.back();
            else
                $("#post" + id).remove()
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
    })
}

$("a.watch-post").click(function() {
    var link = $(this)
    var info = link.parents(".post")
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    var watching = !!info.data("watching")

    $.ajax({
        url: "/entries/" + id + "/watching",
        method: watching ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            watching = !!resp.isWatching
            info.data("watching", watching)

            if(watching)
                link.html("Отписаться от&nbsp;комментариев")
            else
                link.html("Подписаться на&nbsp;комментарии")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            info.data("enabled", true)
        },
    })

    return false
})

function loadComments(href) {
    $.ajax({
        url: href,
        success: function(data) {
            $("a.more-comments").remove()
            var comments = formatTimeHtml(data)
            $("#comments").prepend(comments)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
    })
}

$("#post-comment").click(function() { 
    $("#comment-editor").ajaxSubmit({
        resetForm: true,
        success: function(data) {
            var cmt = formatTimeHtml(data)
            $("#comments").append(cmt)
        },
        error: function(data) {
            alert(data)
        },
    })

    return false;
})

function replyComment(showName) { 
    var area = $("#comment-editor textarea")
    area.val(function(i, val){
        return showName + ", " + val;
    })

    $("html, body").animate({ scrollTop: area.offset().top }, 500);

    return false
}

function deleteComment(id) {
    if(!confirm("Комментарий будет удален навсегда."))
        return false

    $.ajax({
        url: "/comments/" + id,
        method: "DELETE",
        success: function() {
            $("#comment" + id).remove()
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
    })

    return false
}
