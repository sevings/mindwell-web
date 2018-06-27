function vote(id, positive) {
    var post = $("#post" + id)
    var rating = $(".post-rating", post)
    if(rating.data("enabled") == false)
        return

    rating.data("enabled", true)

    var vote = rating.data("vote")
    var delVote = ((positive && vote == "pos") || (!positive && vote == "neg"))

    $.ajax({
        url: "/entries/" + id + "/vote?positive=" + positive,
        method: delVote ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            var count = (resp.votes || 0)
            $(".post-up-count", rating).text(count)
            $(".post-down-count", rating).text(count)
            
            var rate = (resp.rating || 0)
            rating.attr("title", "Рейтинг: " + Math.round(rate))

            rating.find("data-fa-i2svg")
                .toggleClass("far")
                .toggleClass("fas")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            rating.data("enabled", true)
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
