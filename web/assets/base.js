function formatDate(unix) {
    var date = new Date(unix * 1000)
    
    function time() {
        var min = date.getMinutes()
        if(min < 10)
            min = "0" + min       
            
        return date.getHours() + ":" + min 
    }

    let today = new Date()
    if(today.getDate() === date.getDate()
        && today.getMonth() === date.getMonth()
        && today.getFullYear() === date.getFullYear())
        return "Сегодня в " + time()

    let yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if(yesterday.getDate() === date.getDate()
        && yesterday.getMonth() === date.getMonth()
        && yesterday.getFullYear() === date.getFullYear())
        return "Вчера в " + time()

    let tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if(tomorrow.getDate() === date.getDate()
        && tomorrow.getMonth() === date.getMonth()
        && tomorrow.getFullYear() === date.getFullYear())
        return "Завтра в " + time()

    var str = date.getDate()

    switch (date.getMonth()) {
    case 0:
        str += " января"
        break
    case 1:
        str += " февраля"
        break
    case 2:
        str += " марта"
        break
    case 3:
        str += " апреля"
        break
    case 4:
        str += " мая"
        break
    case 5:
        str += " июня"
        break
    case 6:
        str += " июля"
        break
    case 7:
        str += " августа"
        break
    case 8:
        str += " сентября"
        break
    case 9:
        str += " октября"
        break
    case 10:
        str += " ноября"
        break
    case 11:
        str += " декабря"
        break
    default:
        str += " " + date.getMonth()
        break
    }

    if (today.getFullYear() !== date.getFullYear())
        str += " " + date.getFullYear()

    return str
}

function formatTimeElements(context) {
    $("time", context).each(function() {
        var unix = $(this).attr("datetime")
        var text = formatDate(unix)
        var title = new Date(unix * 1000).toLocaleString()
        $(this).text(text).attr("title", title)
    })    
}

function formatTimeHtml(html) {
    var template = document.createElement('template')
    template.innerHTML = html
    var elements = template.content.childNodes
    formatTimeElements(elements)
    return elements
}

formatTimeElements()

function showAjaxError(req) {
    var resp = JSON.parse(req.responseText)
    alert(resp.message)
}

// for counting new lines properly
$("textarea").each(function() {
    var area = $(this)
    var max = area.prop("maxlength")
    if(max <= 0)
        return;
        
    area.maxlength({
        max: max,
        showFeedback: false,
    })
})

// workaround for a Chrome bug
// https://stackoverflow.com/questions/44245032/svg-symbols-not-loading-with-ajax-content-in-chrome#comment75501160_44245032
function fixSvgUse(elem) {
    elem.find("use").each((i, e) => e.replaceWith(e.cloneNode()))
}

function unescapeHtml(text) {
    return text
        .replace(/&amp;/g,  "&")
        .replace(/&lt;/g,   "<")
        .replace(/&gt;/g,   ">")
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g,  '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g,  "'")
}

$(function() {
    let w = window
    let s = w.screen
    let n = w.navigator

    let vpw = Math.round($(w).width())
    Cookies.set("vpw", vpw, { expires: 365, sameSite: "Lax" })

    let dev = Cookies.get("dev")
    if(!dev) {
        let isLs = ((screen.orientation || {}).type || "").startsWith("landscape")
        dev = (n.platform || "no") + ";" + (n.hardwareConcurrency || 0) + ";" + (n.maxTouchPoints || 0) +
            ";" + (isLs ? s.width : s.height) + ";" + (isLs ? s.height : s.width) + ";" + s.colorDepth +
            ";" + new Date().getTimezoneOffset()

        let a = 1, b = 0
        for(let i = 0; i < dev.length; i++)
        {
            let c = dev.charCodeAt(i)
            a += c
            b += a
        }
        dev = b % 65521 * 65536 + a % 65521
        dev = dev.toString(16)

        Cookies.set("dev", dev, { expires: 1826, sameSite: "Lax" })
    }
})

$("#login-scroll").click(function() {
    return $("#login-section").velocity("scroll", { duration: 1000, easing: "easeInOutSine" })
})

 $("#send-recover").click(function() {
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;

    var form = $("#recover-email")
    if(!form[0].reportValidity())
        return false

    btn.addClass("disabled")

    var status = $("#recover-status")
    
    form.ajaxSubmit({
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            status.text("Письмо отправлено. Проверь свой почтовый ящик.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            var msg = resp ? resp.message : ""
            status.text(msg)
            status.addClass("alert-danger").removeClass("alert-success")
            btn.removeClass("disabled")
        },
        complete: function() {
            status.toggleClass("alert", true)
        },
    })

    return false;
})

$("#send-reset").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;

    var form = $("#reset-password")
    if(!form[0].reportValidity())
        return false
        
    btn.addClass("disabled")

    var status = $("#reset-status")
    
    form.ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            status.text("Теперь ты можешь войти в свой аккаунт, используя новый пароль.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            var msg = resp ? resp.message : ""
            status.text(msg)
            status.addClass("alert-danger").removeClass("alert-success")
            btn.removeClass("disabled")
        },
        complete: function() {
            status.toggleClass("alert", true)
        },
    })

    return false;
})

window.addEventListener('touchstart', function onFirstTouch() {
    window.isTouchScreen = true;
    window.removeEventListener('touchstart', onFirstTouch, false);
}, false);

$(".show-password").click(function() {
    var input = $(this).parents("form").find("input[name='password']")
    if($(this).prop("checked"))
        input.attr("type", "text")
    else
        input.attr("type", "password")
})

$(".register").click(function() {
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;

    let form = btn.parents("form")
    let accept = $("input[name='accept']", form)
    if(accept.length > 0 && !accept.prop("checked"))
    {
        alert("Для регистрации необходимо согласие с правилами")
        return false
    }

    if(!form[0].reportValidity())
        return false

    let name = form.find("input[name='name']").val()
    form.find("input[name='antibot']").val(name + name)

    btn.addClass("disabled")

    form.ajaxSubmit({
        dataType: "json",
        headers: {
            "X-Error-Type": "JSON",
        },
        xhrFields: {
            withCredentials: true
        },
        success: function(data) {
            window.location.href = data.href
        },
        error: function(req) {
            let resp = JSON.parse(req.responseText)
            if(resp.message)
                alert(resp.message)
            else
                alert("Неверный логин или пароль.")
        },
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("a.forgot").click(function(){
    $("#registration-login-form-popup").modal("hide")
    $("#recover-popup").modal("show")

    return false
})
