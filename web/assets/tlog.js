$("#follow, #unfollow").click(function() {
    return setRelationFromMe("followed")
})

$("#hide-posts").click(function() {
    return setRelationFromMe("hidden")
})

$("#blacklist").click(function() {
    return setRelationFromMe("ignored")
})

$("#permit-rel").click(function() {
    return handleFriendRequest("PUT")
})

$("#cancel-rel").click(function() {
    return handleFriendRequest("DELETE")
})

function setRelationFromMe(relation) {
    var profile = $("#profile")
    var name = profile.data("name")
    var relationFromMe = profile.data("relFromMe")

    var method
    if(relationFromMe == relation || (relation == "followed") && relationFromMe == "requested")
        method = "DELETE"
    else
        method = "PUT"

    $.ajax({
        url: "/relations/to/" + name + "?r=" + relation,
        method: method,
        dataType: "json",
        success: function(resp) {
            profile.data("name", resp.to)
            profile.data("relFromMe", resp.relation)

            updateRelations()
        },
        error: showAjaxError,
    })    

    return false
}

function handleFriendRequest(method) {
    var profile = $("#profile")
    var name = profile.data("name")

    $.ajax({
        url: "/relations/from/" + name,
        method: method,
        dataType: "json",
        success: function(resp) {
            profile.data("name", resp.from)
            profile.data("relToMe", resp.relation)

            updateRelations()
        },
        error: showAjaxError,
    })

    return false
}

function updateRelations() {
    var profile = $("#profile")
    var privacy = profile.data("privacy")
    var mePrivacy = $("body").data("mePrivacy")
    var relationToMe = profile.data("relToMe")
    var relationFromMe = profile.data("relFromMe")
    
    var followed = relationFromMe == "followed"

    var followBtn = $("#follow")
    followBtn.attr("hidden", followed)

    var unfollow = $("#unfollow")
    unfollow.parent().attr("hidden", !followed)

    if(!followed) {
        followBtn.removeClass("bg-blue bg-breez bg-grey")

        if(relationFromMe == "requested")
            followBtn.addClass("bg-breez")
        else if(relationFromMe == "ignored" || relationFromMe == "hidden")
            followBtn.addClass("bg-grey")
        else
            followBtn.addClass("bg-blue")        
    }

    var ignored = relationToMe == "ignored" || relationFromMe == "ignored" || relationFromMe == "hidden"
    followBtn.toggleClass("disabled", ignored)

    var followTitle

    if(relationToMe == "ignored")
        followTitle = "Ты в черном списке"
    else if(relationFromMe == "ignored")
        followTitle = "В черном списке"
    else if(relationFromMe == "hidden")
        followTitle = "Скрыто из эфира"
    else if(relationFromMe == "followed")
        followTitle = "Отписаться"
    else if(relationFromMe == "requested")
        followTitle = "Отменить заявку"
    else if(privacy != "followers")
        followTitle = "Подписаться"
    else
        followTitle = "Отправить заявку"

    followBtn.attr("title", followTitle)

    var permit = $("#permit-rel")
    var cancel = $("#cancel-rel")
    var requested = relationToMe == "requested"
    var followed  = relationToMe === "followed"
    permit.attr("hidden", !requested)
    cancel.attr("hidden", mePrivacy != "followers" || (!requested && !followed))

    if(requested)
        cancel.attr("title", "Отклонить заявку")
    else
        cancel.attr("title", "Отписать")

    var blacklist = $("#blacklist")
    if(relationFromMe == "ignored")
        blacklist.text("Разблокировать")
    else
        blacklist.text("Заблокировать")

    var hidePosts = $("#hide-posts")
    if(relationFromMe == "hidden")
        hidePosts.text("Не скрывать из эфира")
    else
        hidePosts.text("Скрывать из эфира")
}

updateRelations()

$(function(){
    var el = $("#user-days")
    var date = el.data("createdAt")
    date = formatDate(date)
    el.attr("title", date)
})

$("#invite-user").on("show.bs.modal", function() {
    var list = $("#invite-list")

    if(list.length > 0)
        return

    $.ajax({
        url: "/account/invites",
        dataType: "json",
        success: function(resp) {
            var send = $("#send-invite")

            if(!resp.invites) {
                var msg = "У тебя пока нет свободных приглашений."
                send.before('<div id="invite-list" class="alert alert-secondary" role="alert">' + msg + '</div>')
                    .addClass("hidden")
                return
            }

            send.before('<select id="invite-list" class="selectpicker form-control" name="invite"></select>')
            list = $("#invite-list")

            for(var i = 0; i < resp.invites.length; i++) {
                var inv = resp.invites[i]
                list.append("<option value='" + inv + "'>" + inv + "</option>")
            }

            $('.selectpicker').selectpicker("refresh")
            send.removeClass("disabled")
        },
        error: showAjaxError,
    })
})

$("#send-message").click(function(){
    let uid = $("#message-uid")
    if(!uid.val())
        uid.val(Date.now())

    let form = $("#message-sender")
    if(!form[0].reportValidity())
        return false

    $("#message-sender").ajaxSubmit({
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            $("#private-message").modal("hide")
            uid.val("")
        },
        error: showAjaxError,
        clearForm: true,
    })

    return false
})

$("#send-invite").click(function(){
    if($(this).hasClass("disabled"))
        return false

    $("#user-inviter").ajaxSubmit({
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            $("#invite-user").modal("hide")
            $("#give-invite").addClass("hidden")

            var meName = $("body").data("meName")
            var meShowName = $("body").data("meShowName")
            $("#invited-by").removeClass("hidden")
                .find("a").attr("href", "/users/" + meName).text(meShowName)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            $("#send-invite").addClass("hidden")
                .before('<div class="alert alert-danger" role="alert">' + resp.message + '</div>')
        },
    })

    return false
})

$(".upload-image").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false

    var form = btn.parent()
    if(!form[0].reportValidity())
        return false

    if(!checkFileSize(form))
        return false

    btn.addClass("disabled")

    var sk = btn.parents(".modal-body").find(".skills-item")
    sk.attr("hidden", false)
    var bar = sk.find(".skills-item-meter-active")
    var units = sk.find(".units")

    form.ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        uploadProgress: function(e, pos, total, percent) {
            bar.width(percent + "%")
            units.text(Math.round(pos / 1024) + " из " + Math.round(total / 1024) + " Кб")
        },
        success: function() {
            btn.parents(".modal-body").find(".alert").attr("hidden", false)
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
            form.find(".control-label").text("")
            bar.width(0)
            units.text("")
            sk.attr("hidden", true)
        },
    })

    return false
})

$("#feed-sort").on("change", function(){
    let container = $("#feed")
    let sort = this.value
    container.data("sort", sort)

    let params = new URLSearchParams(document.location.search)
    params.set("sort", sort)
    params.delete("query")
    params.delete("tag")
    let url = document.location.pathname + "?" + params.toString()

    let clear = () => {
        container.find(".pagination").parents(".sorting-item").remove()
        $("#feed-search").resetForm()
        container.find("option[value='search'").remove()
        $(this).selectpicker("refresh")
        container.children(".entry").remove()
    }

    loadFeed(url, clear)
})

function fullCalendar() {
    let calendarEl = $("#calendar")
    if(!calendarEl.length)
        return

    let calendar = new FullCalendar.Calendar(calendarEl[0], {
        initialView: 'dayGridMonth',
        titleFormat: function(date) {
            const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
            let month = months[date.date.marker.getMonth()]
            let year = date.date.marker.getFullYear()
            if(new Date().getFullYear() === year)
                return month

            return month + " " + year + " г.";
        },
        headerToolbar: {
            left: 'prevYear,prev',
            center: 'title',
            right: 'next,nextYear'
        },
        displayEventTime: false,
        displayEventEnd: false,
        dayMaxEventRows: 1,
        moreLinkContent: (arg) => { return "+" + arg.num },
        moreLinkClassNames: "calendar-more-posts",
        eventDisplay: "block",
        eventColor: "#ff5e3a",
        locale: "ru",
        height: "auto",
        eventClick: function(info) {
            info.jsEvent.preventDefault()
            openPost(info.event.id)
        },
    })

    let getEvents = (info, onSuccess, onError) => {
        let name = $("#profile").data("name")
        let start = info.start.getTime() / 1000
        let end = info.end.getTime() / 1000
        $.ajax({
            dataType: "json",
            headers: {
                "X-Error-Type": "JSON",
            },
            url: "/users/" + name + "/calendar?start=" + start + "&end=" + end,
            success: (resp) => {
                calendar.setOption("validRange", {
                    start: resp.start * 1000,
                    end: resp.end * 1000
                })

                if(!resp.entries) {
                    onSuccess([])
                    return
                }

                let events = resp.entries.map((entry) => {
                    return {
                        id: entry.id,
                        url: "/entries/" + entry.id,
                        title: entry.title,
                        start: entry.createdAt * 1000,
                    }
                })

                onSuccess(events)
            },
            error: (resp) => {
                console.log(resp)
                onError(resp)
            },
        })
    }

    calendar.addEventSource(getEvents)
    calendar.render()
}

$(fullCalendar)
