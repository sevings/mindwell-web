$("a.post-down").click(function() {
    vote($(this), false)
    return false
})

$("a.post-up").click(function() {
    vote($(this), true)
    return false
})

function vote(counter, positive) {
    var info = counter.parents(".entry")
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

    $(".post-popup.show").removeClass("fade").modal("hide");

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
    var info = $(this).parents(".entry")
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    var watching = !!info.data("watching")
    var link = info.find("a.watch-post")

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
    var info = $(this).parents(".entry")
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    var favorited = !!info.data("favorited")
    var link = info.find("a.favorite-post")

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

function loadComments(href, a) {
    a = $(a)
    if(a.hasClass("disabled"))
        return false

    a.addClass("disabled")

    $.ajax({
        url: href,
        success: function(data) {
            var ul = a.parent()

            var comments = formatTimeHtml(data)
            $(comments).find(".comment-content a").each(embedVideo)
            ul.prepend(comments)
            a.remove()

            var upd = ul.find(".update-comments")
            if(upd.length > 1)
                upd.first().remove()
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            a.removeClass("disabled")
        },
    })

    return false
}

function updateComments(entry) {
    var a = entry.find(".update-comments")
    if(a.hasClass("disabled"))
        return false

    a.addClass("disabled")

    $.ajax({
        url: a.attr("href"),
        success: function(data) {
            var ul = a.parent()
            var hasPrev = ul.find(".comment-item").length > 0
            var hasMore = ul.find(".more-comments").length > 0

            var comments = formatTimeHtml(data)
            $(comments).find(".comment-content a").each(embedVideo)
            ul.append(comments)

            if(ul.find(".update-comments").length > 1)
                a.remove()
            
            if(hasPrev) {
                var more = ul.find(".more-comments")
                if(!hasMore || more.length > 1)
                    more.last().remove()
            }

            // remove duplicates
            var items = {}
            ul.find(".comment-item").each(function(){ 
                var item = $(this)
                var id = item.data("id")

                var prev = items[id]
                if(prev)
                    prev.remove()
                
                items[id] = item
            })
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            a.removeClass("disabled")
        },
    })

    return false
}

function postComment(entry) {
    var btn = entry.find(".post-comment")
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    entry.find("form.comment-form").ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            var cmt = formatTimeHtml(data)
            $(cmt).find("a").each(embedVideo)
            entry.find(".comments-list").append(cmt)

            var counter = entry.find(".comment-count")
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

function sendComment(entry) {
    var form = entry.find(".comment-form")
    var save = form.data("id") > 0

    if(save)
        return saveComment(entry)
    
    return postComment(entry)
}

$(".comment-form textarea").on("keydown", function(e){
    if(e.key != "Enter")
        return

    if(e.shiftKey)
        return

    if(window.isTouchScreen)
        return

    var entry = $(this).parents(".entry")
    entry.find(".comment-form textarea").blur()
    return sendComment(entry)
})

$(".post-comment").click(function(){
    var entry = $(this).parents(".entry")
    return sendComment(entry)
})

function scrollToCommentEdit(area) {
    var modal = $(".post-popup.show")
    if(modal.length > 0)
        modal.animate({ scrollTop: modal.children().outerHeight() }, 500)
    else
        $("html, body").animate({ scrollTop: area.offset().top }, 500);    
}

function replyComment(showName, a) { 
    var entry = $(a).parents(".entry")
    var area = entry.find("form.comment-form textarea")
    area.val(function(i, val){
        if(val.includes(showName))
            return val

        return showName + ", " + val
    })

    scrollToCommentEdit(area)
        
    return false
}

function editComment(id) {
    var cmt = $("#comment" + id)
    var content = unescapeHtml(cmt.data("content") + "")
    var form = cmt.parents(".entry").find(".comment-form")
    form.attr("action", "/comments/"+id)
    form.data("id", id)
    form.find("textarea").val(content)
    form.find(".cancel-comment").toggleClass("hidden", false)
    form.find(".post-comment").text("Сохранить")

    var area = form.find("textarea")
    scrollToCommentEdit(area)

    return false
}

function saveComment(entry) {
    var btn = entry.find(".post-comment")
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var form = entry.find(".comment-form")

    form.ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            var cmt = formatTimeHtml(data)
            $(cmt).find("a").each(embedVideo)
            var id = form.data("id")
            $("#comment"+id).replaceWith(cmt)
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
            clearCommentForm(entry)
        },
    })

    return false
}

function clearCommentForm(entry) {
    var form = entry.find(".comment-form")
    form.attr("action", "/entries/" + entry.data("id") + "/comments")
    form.data("id", "")
    form[0].reset()
    form.find(".cancel-comment").toggleClass("hidden", true)
    form.find(".post-comment").text("Отправить")

    return false
}

$(".cancel-comment").click(function(){
    var entry = $(this).parents(".entry")
    return clearCommentForm(entry)
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

$(".post-popup").on("show.bs.modal", function(event) {
    window.location.hash = this.id;
    
    var entry = $(this).parents(".entry")
    updateComments(entry)
})

$(".post-popup").on("shown.bs.modal", function(event) {
    var a = $(event.relatedTarget)
    if(!a.hasClass("comment-button"))
        return
        
    var modal = $(this)
    var comments = modal.find("ul.comments-list")
    modal.animate({ scrollTop: comments.position().top }, 500);
})

$(".post-popup").on("hide.bs.modal", function() {
    if(window.location.hash == "")
        return

    window.history.back()

    if(window.location.hash != "")
        window.location.hash = ""
})

$(window).on("hashchange", function () {
    if(window.location.hash == "")
        $(".post-popup.show").modal("hide");
    else
        $(window.location.hash).modal("show")
})

$(function(){
    if(window.location.hash != "")
        $(window.location.hash).modal("show")
})

function embedVideo() {
    var a = $(this)
    if(a.text().substring(0, 10) != a.attr("href").substring(0, 10))
        return

    var re = /(?:https?:\/\/)?(?:www\.)?(?:youtube.com\/watch\?.*v=|youtu.be\/)([a-z0-9\-_]+).*/i
    var match = re.exec(a.attr("href"))
    if(match == null)
        return

    var id = match[1]
    a.replaceWith('<iframe type="text/html" width="480" height="270"'
        + ' src="https://www.youtube.com/embed/' + id + '" frameborder="0" allowfullscreen>')    
}

$(".post-content a, .comment-content a").each(embedVideo)
