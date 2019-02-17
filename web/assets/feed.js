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
            var loc = window.location;
            if((loc.pathname == "/entries/" + id &&
                document.referrer == loc.origin + loc.pathname) || // for ignore hash
                document.referrer == loc.origin + loc.pathname + "/edit")
                    loc.replace(loc.origin + "/me");
            else if(loc.pathname == "/entries/" + id)
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

$("a.favorite-post").click(function() {
    var link = $(this)
    var info = link.parents(".post")
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    var favorited = !!info.data("favorited")

    $.ajax({
        url: "/entries/" + id + "/favorite",
        method: favorited ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            favorited = !!resp.isFavorited
            info.data("favorited", favorited)

            if(favorited)
                link.html("Удалить из&nbsp;избранного")
            else
                link.html("Добавить в&nbsp;избранное")
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

function postComment() {
    var btn = $("#post-comment")
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    $("#comment-editor").ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            var cmt = formatTimeHtml(data)
            $("#comments").append(cmt)

            var counter = $("#comment-count")
            var count = counter.text()
            count++
            counter.text(count)
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false;
}

$("#comment-editor textarea").on("keydown", function(e){
    if(e.key != "Enter")
        return

    if(e.shiftKey)
        return

    if(window.isTouchScreen)
        return

    postComment()
})

$("#post-comment").click(postComment)

function replyComment(showName) { 
    var area = $("#comment-editor textarea")
    area.val(function(i, val){
        if(val.includes(showName))
            return val

        return showName + ", " + val;
    })

    $("html, body").animate({ scrollTop: area.offset().top }, 500);

    return false
}

$("#edit-comment").on("show.bs.modal", function(event) {
    var a = $(event.relatedTarget)
    var form = $("#existing-comment-editor")

    var id = a.parents(".comment-item").data("id")
    form.attr("action", "/comments/"+id)
    form.data("id", id)

    var content = unescapeHtml(a.data("content") + "")
    $("textarea", form).val(content)
})

$("#save-comment").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    $("#existing-comment-editor").ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            var cmt = formatTimeHtml(data)
            var id = $("#existing-comment-editor").data("id")
            $("#comment"+id).replaceWith(cmt)
        },
        error: showAjaxError,
        complete: function() {
            $('#edit-comment').modal('hide')
            btn.removeClass("disabled")
        },
    })

    return false;
})

function deleteComment(id) {
    if(!confirm("Комментарий будет удален навсегда."))
        return false

    $.ajax({
        url: "/comments/" + id,
        method: "DELETE",
        success: function() {
            $("#comment" + id).remove()
        },
        error: showAjaxError,
    })

    return false
}

function voteComment(id, positive) {
    var cmt = $("#comment"+id)
    if(cmt.data("enabled") == false)
        return false

    cmt.data("enabled", false)

    var vote = cmt.data("vote")
    var delVote = ((positive && vote == "pos") || (!positive && vote == "neg"))

    $.ajax({
        url: "/comments/" + id + "/vote?positive=" + positive,
        method: delVote ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            cmt.data("vote", resp.vote)

            var upLink = cmt.find(".comment-up")
            var downLink = cmt.find(".comment-down")
            var span = cmt.find(".comment-rating")

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
        error: showAjaxError,
        complete: function() {
            cmt.data("enabled", true)
        },
    })

    return false;
}
