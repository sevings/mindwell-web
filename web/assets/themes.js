$("#new-theme").on("show.bs.modal", function() {
    var inviteCount = $("#invite-count")

    if(inviteCount.length > 0)
        return

    $.ajax({
        url: "/account/invites",
        dataType: "json",
        success: function(resp) {
            let create = $("#create-theme")
            let count = resp.invites ? resp.invites.length : 0;

            if(!count) {
                let msg = "У тебя пока нет свободных приглашений."
                create.before('<div id="invite-count" class="alert alert-secondary" role="alert">' + msg + '</div>')
                    .addClass("hidden")
                return
            }

            let msg = ""

            if(count === 1)
                msg = "У тебя одно свободное приглашение."
            else
                msg = "У тебя " + count + " свободных приглашения."

            create.before('<div id="invite-count" class="alert alert-success" role="alert">' + msg + '</div>')
                .removeClass("disabled")
        },
        error: showAjaxError,
    })
})

$("#create-theme").click(function() {
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false

    let form = $("#theme-creator")
    if(!form[0].reportValidity())
        return false

    btn.addClass("disabled")

    form.ajaxSubmit({
        dataType: "json",
        success: function(data) {
            window.location.pathname = data.path
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false
})
