$("a.post-down-count").click(function() {
    vote($(this), false)
    return false
})

$("a.post-up-count").click(function() {
    vote($(this), true)
    return false
})

function vote(counter, positive) {
    var info = counter.parents(".post-additional-info")
    if(info.data("enabled") == false)
        return

    info.data("enabled", true)

    var id = info.data("id")
    var vote = info.data("vote")
    var delVote = ((positive && vote == "pos") || (!positive && vote == "neg"))

    $.ajax({
        url: "/entries/" + id + "/vote?positive=" + positive,
        method: delVote ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            var upCounter = info.find(".post-up-count")
            var downCounter = info.find(".post-down-count")

            var count = (resp.votes || 0)
            upCounter.find("span").text(count)
            downCounter.find("span").text(count)
            
            var title = "Рейтинг: " + Math.round(resp.rating || 0)
            upCounter.attr("title", title)
            downCounter.attr("title", title)

            var up = resp.vote == "pos"
            upCounter.find("[data-fa-i2svg]")
                .toggleClass("far", !up)
                .toggleClass("fas", up)

            var down = resp.vote == "neg"
            downCounter.find("[data-fa-i2svg]")
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
        return

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
