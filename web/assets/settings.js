$("#save-password").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#password-status")
    
    $("#change-password").ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            status.text("Пароль изменен.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#save-email").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#email-status")
    
    $("#change-email").ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            status.text("На новую почту отправлено письмо с кодом для подтверждения.")
            status.removeClass("alert-danger")
                .removeClass("alert-secondary")
                .toggleClass("alert-success", true)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.toggleClass("alert-danger", true)
                .removeClass("alert-secondary")
                .removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#save-notification-settings").click(function() {
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    let status = $("#notification-settings-status")

    function onSuccess() {
        status.text("Настройки сохранены.")
        status.removeClass("alert-danger").addClass("alert-success")
        status.toggleClass("alert", true)
        btn.removeClass("disabled")
    }

    function onError(req) {
        let resp = JSON.parse(req.responseText)
        status.text(resp.message)
        status.addClass("alert-danger").removeClass("alert-success")
        status.toggleClass("alert", true)
        btn.removeClass("disabled")
    }

    $.ajax({
        method: "PUT",
        data: $("#notification-settings .email").fieldSerialize(),
        url: "/account/settings/email",
        success: () => {
            status.data("email", "success")
            if(status.data("telegram") === "success")
                onSuccess()
        },
        error: (req) => {
            status.data("email", "error")
            if(status.data("telegram") !== "error")
                onError(req)
        },
    })

    $.ajax({
        method: "PUT",
        data: $("#notification-settings .telegram").fieldSerialize(),
        url: "/account/settings/telegram",
        success: () => {
            status.data("telegram", "success")
            if(status.data("email") === "success")
                onSuccess()
        },
        error: (req) => {
            status.data("telegram", "error")
            if(status.data("email") !== "error")
                onError(req)
        },
    })

    return false;
})

$("#email-status a").click(function() { 
    var p = $("#email-status")
    $.ajax({
        url: "/account/verification",
        method: "POST",
        success: function() {
            p.text("Письмо с кодом подтверждения отправлено на почту.")
            p.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            p.text("При выполнении запроса произошла ошибка: " + resp.message)
        },
    })

    return false
})

$(".remove-user").click(function(){
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var title = btn.attr("aria-describedby")
    var user = btn.parents(".ignored-user")
    var name = user.data("userName")
    $.ajax({
        url: "/relations/to/"+name,
        method: "DELETE",
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            user.addClass("removed")
            btn.remove()
            if(title)
                $("#" + title).remove()
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false
})

$("#save-grandson").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#grandson-status")
    
    $("#grandson").ajaxSubmit({
        success: function() {
            status.text("Адрес сохранен.")
            btn.text("Сохранить")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#save-grandfather").click(function() {
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false;

    btn.addClass("disabled")

    let status = $("#grandfather-status")

    $("#grandfather").ajaxSubmit({
        success: function() {
            status.text("Сохранено.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            let resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#gift-received").change(function(){
    var status = $("#grandson-status")
    
    var received = $(this).prop("checked")
    $.ajax({
        url: "/adm/grandson/status?received="+received,
        method: "POST",
        success: function() {
            status.text("Сохранено.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
        },
    })

    return false;
})
