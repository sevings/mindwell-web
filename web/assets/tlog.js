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
    permit.attr("hidden", !requested)
    cancel.attr("hidden", mePrivacy != "followers" || (!requested && relationToMe !== "followed"))

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

    let createdBy = profile.data("createdBy")
    let meID = $("body").data("meId")
    let isCreator = createdBy === meID
    let postBtn = $("#create-post")
    postBtn.attr("hidden", !followed && !isCreator)
}

updateRelations()

$(function(){
    var el = $("#user-days")
    var date = el.data("createdAt")
    date = formatDate(date)
    el.attr("title", date)
})

$("#complain-profile").click(function() {
    let profile = $("#profile")
    let name = profile.data("name")
    let isTheme = profile.data("isTheme")
    let url = (isTheme ? "/themes/" : "/users/") + name + "/complain"

    $("#complain-user").text(name)
    $("#complain-type").text(isTheme ? "тему" : "профиль")

    let popup = $("#complain-popup")
    popup.data("ready", true)
    popup.find(".contact-form").attr("action", url)
    popup.modal("show")

    return false
})

function updatePrivacyInfo() {
    let isTheme = $("#profile").data("isTheme")
    let value = $("#edit-profile select[name='privacy']").val()
    let text = ""

    if(isTheme) {
        if(value === "all")
            text = "Зарегистрированные пользователи видят всю информацию профиля, открытые записи, участников. " +
                "Люди без аккаунта на Майндвелле могут видеть основную информацию профиля и открытые записи. " +
                "Профиль может индексироваться поисковыми системами. "
        else if(value === "registered")
            text = "Зарегистрированные пользователи видят всю информацию профиля, открытые записи, участников. " +
                "Людям без аккаунта на Майндвелле и поисковым системам профиль недоступен. "
        else if(value === "invited")
            text = "Пользователи, получившие приглашение на Майндвелл, видят всю информацию профиля, открытые записи, участников. " +
                "Зарегистрированные пользователи без приглашений видят только основную информацию. " +
                "Людям без аккаунта на Майндвелле и поисковым системам профиль недоступен. "
    } else {
        if(value === "all")
            text = "Зарегистрированные пользователи видят всю информацию твоего профиля, открытые записи, подписки, избранное. " +
                "Люди без аккаунта на Майндвелле могут видеть основную информацию профиля и открытые записи. " +
                "Профиль может индексироваться поисковыми системами. "
        else if(value === "registered")
            text = "Зарегистрированные пользователи видят всю информацию твоего профиля, открытые записи, подписки, избранное. " +
                "Людям без аккаунта на Майндвелле и поисковым системам твой профиль недоступен. "
        else if(value === "invited")
            text = "Пользователи, получившие приглашение на Майндвелл, видят всю информацию твоего профиля, открытые записи, подписки, избранное. " +
                "Зарегистрированные пользователи без приглашений видят только основную информацию. " +
                "Людям без аккаунта на Майндвелле и поисковым системам твой профиль недоступен. "
        else if(value === "followers")
            text = "Твои подписчики видят всю информацию твоего профиля, открытые записи, подписки, избранное. " +
                "Другие зарегистрированные пользователи видят только основную информацию. " +
                "Людям без аккаунта на Майндвелле и поисковым системам твой профиль недоступен. "
    }


    $("#privacy-info").text(text)
}

$(updatePrivacyInfo())
$("#edit-profile select[name='privacy']").change(updatePrivacyInfo)

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
    }

    loadFeed(url, clear, true)
})

function fullCalendar() {
    let calendarEl = $("#calendar")
    if(!calendarEl.length)
        return

    let calendar = new FullCalendar.Calendar(calendarEl[0], {
        initialView: 'dayGridMonth',
        titleFormat: function(date) {
            const shortMonths = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
            const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]

            let month = date.date.marker.getMonth()
            let year = date.date.marker.getFullYear()
            let width = Math.round($(window).width())
            month = (width >= 1200 && width <= 1440) ? shortMonths[month] : months[month]
            if(new Date().getFullYear() === year)
                return month

            return month + " " + year;
        },
        headerToolbar: {
            start: 'prevYear,prev',
            center: 'title',
            end: 'next,nextYear'
        },
        displayEventTime: false,
        displayEventEnd: false,
        defaultTimedEventDuration: "00:00:00",
        dayMaxEventRows: 1,
        moreLinkContent: (arg) => { return "+" + arg.num },
        moreLinkClassNames: "calendar-more-posts",
        eventDisplay: "block",
        eventColor: "#ff5e3a",
        locale: "ru",
        height: "auto",
        validRange: {
            start: $("#profile").data("createdAt") * 1000,
            end: new Date()
        },
        eventClick: (info) => {
            info.jsEvent.preventDefault()
            openPost(info.event.id)
        },
        events: (info, onSuccess, onError) => {
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
                    if(!resp.entries) {
                        onSuccess([])
                        return
                    }

                    let events = resp.entries.map((entry) => {
                        return {
                            id: entry.id,
                            url: "/entries/" + entry.id,
                            title: unescapeHtml(entry.title),
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
    })

    calendar.render()
}

$(fullCalendar)

$(function() {
    $(".user-badge").each(function() {
        let badge = $(this);
        let title = badge.data("title")
        let desc = badge.data("description")
        let at = formatDate(badge.data("givenAt")).toLowerCase()
        let content = "<p>" + desc + "<p><p>Получен " + at + ".</p>"
        badge.popover({
            title: title,
            content: content,
            placement: "top",
            html: true,
            trigger: "focus",
        })
    })
})
