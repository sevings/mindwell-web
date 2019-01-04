function setOnline() {
    function sendRequest() {
        $.ajax({
            url: "/me/online",
            method: "PUT"
        })    
    }

    setInterval(sendRequest, 180000)

    sendRequest()
}

$(setOnline)

var notifications = {
    after: "", 
    hasAfter: true,
    loadingAfter: false,
    reloadAfter: false,

    before: "",
    hasBefore: true,
    loadingBefore: false,
    
    unread: 0,
    centrifuge: null,

    setUnread: function(val) {
        var unread 
        if(typeof val == "number")
            unread = val
        else
            unread = val.data("unreadCount")
        
        if(unread == notifications.unread)
            return

        $(".notifications-counter")
            .text(unread)
            .toggleClass("hidden", unread == 0)

        var title = document.title
        var repl = unread ? "(" + unread + ") " : ""
        title = title.replace(/^(?:\(\d+\) )?/, repl)
        document.title = title

        notifications.unread = unread
    },
    setBefore: function(ul) {
        notifications.hasBefore = ul.data("hasBefore")
        var nextBefore = ul.data("before")
        if(nextBefore)
            notifications.before = nextBefore        
    },
    setAfter: function(ul) {
        notifications.hasAfter = ul.data("hasAfter")
        var nextAfter = ul.data("after")
        if(nextAfter)
            notifications.after = nextAfter
    },
    addClickHandler: function(ul) {
        $("a", ul).click(notifications.read)
    },
    read: function() {
        if(!notifications.unread)
            return 

        $("ul.notification-list > li.un-read").removeClass("un-read")

        notifications.setUnread(0)

        $.ajax({
            url: "/notifications/read?time=" + notifications.after,
            method: "PUT",
        })        
    },
    check: function() {
        if(notifications.loadingAfter) {
            notifications.reloadAfter = true
            return
        }

        notifications.loadingAfter = true
        notifications.reloadAfter = false
        
        $.ajax({
            url: "/notifications?unread=true&after=" + notifications.after,
            method: "GET",
            success: function(data) {
                var ul = $(formatTimeHtml(data))
                notifications.addClickHandler(ul)
                notifications.setUnread(ul)
                notifications.setAfter(ul)

                var list = $("ul.notification-list")
                list.prepend(ul).children(".data-helper").remove()

                if(list.children().length > 0) {
                    $(".notifications-placeholder").remove()
                    if(!notifications.before) {
                        notifications.setBefore(ul)
                    }
                }
            },
            error: function(req) {
                var resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: function() {
                notifications.loadingAfter = false
                if(notifications.reloadAfter)
                    notifications.check()
            },
        })
    },
    loadHistory: function() {
        if(notifications.loadingBefore)
            return

        if(!notifications.hasBefore)
            return
    
        notifications.loadingBefore = true;

        $.ajax({
            url: "/notifications?limit=10&before=" + notifications.before,
            method: "GET",
            success: function(data) {
                var ul = $(formatTimeHtml(data))
                notifications.addClickHandler(ul)
                notifications.setUnread(ul)
                notifications.setBefore(ul)

                var list = $("ul.notification-list")
                list.append(ul).children(".data-helper").remove()

                if(list.children().length > 0)
                    $(".notifications-placeholder").remove()
            },
            error: function(req) {
                var resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: function() { 
                notifications.loadingBefore = false
            },
        })
    },
    isConnected : function() {
        return notifications.centrifuge && notifications.centrifuge.isConnected()
    },
    connect: function(token) {
        var url = "ws://" + document.location.host + "/centrifugo/connection/websocket"
        var cent = new Centrifuge(url)

        cent.setToken(token)

        var id = $("body").data("meId")
        cent.subscribe("notifications#" + id, function() {
            notifications.check()
        })
        
        cent.connect()

        notifications.centrifuge = cent
    },
    start: function() {
        $.ajax({
            method: "GET",
            url: "/account/subscribe/token",
            dataType: "json",
            success: function(resp) {
                notifications.connect(resp.token)
            }
        })

        notifications.check()
    }
}

$(function() {
    notifications.start()
})

$(".more-dropdown .notifications").mouseout(notifications.read)

$(".notifications-control").mouseenter(function() {
    if($("ul.notification-list").children().length < 5)
        notifications.loadHistory()    
})

$("a[href='#notifications']").click(function() {
    var a = $(this)
    var read = a.data("read")
    a.data("read", !read)
    
    if(read)
        notifications.read()
    else if($("ul.notification-list").children().length < 5)
        notifications.loadHistory()
})

$("div.notifications").scroll(function() { 
    var scroll = $(this)
    var list = $("ul", scroll)

    if(scroll.scrollTop() < list.height() - scroll.height() - 300)
        return

    notifications.loadHistory()
});

function formatDate(unix) {
    var today = new Date()
    var date = new Date(unix * 1000)
    
    function time() {
        var min = date.getMinutes()
        if(min < 10)
            min = "0" + min       
            
        return date.getHours() + ":" + min 
    }

    if(today.getDate() == date.getDate() 
        && today.getMonth() == date.getMonth() 
        && today.getFullYear() == date.getFullYear())
        return "Сегодня в " + time()

    var yesterday = today
    yesterday.setDate(today.getDate() - 1)

    if(yesterday.getDate() == date.getDate()
        && yesterday.getMonth() == date.getMonth() 
        && yesterday.getFullYear() == date.getFullYear())
        return "Вчера в " + time()

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

 $("#send-recover").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#recover-status")
    
    $("#recover-email").ajaxSubmit({
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
        
    btn.addClass("disabled")

    var status = $("#reset-status")
    
    $("#reset-password").ajaxSubmit({
        resetForm: true,
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

// $(document).ready(function() {
//     var options = {
//         /* basic config parameters */
//             selector : "a:not(.no-ajaxy)", //Selector for elements to ajaxify - without being swapped - e.g. a selection of links
//             maincontent : "#ajaxify-content", //Default main content is last element of selection, specify a value like "#content" to override
//             forms : "form:not(.no-ajaxy)", // jQuery selection for ajaxifying forms - set to "false" to disable
//             canonical : true, // Fetch current URL from "canonical" link if given, updating the History API.  In case of a re-direct...
//             refresh : true, // Refresh the page if clicked link target current page
         
//         /* visual effects settings */
//             requestDelay : 0, //in msec - Delay of Pronto request
//             aniTime : 0, //in msec - must be set for animations to work
//             aniParams : false, //Animation parameters - see below.  Default = off
//             previewoff : true, // Plugin previews prefetched pages - set to "false" to enable or provide a jQuery selection to selectively disable
//             scrolltop : "s", // Smart scroll, true = always scroll to top of page, false = no scroll
//             bodyClasses : false, // Copy body classes from target page, set to "true" to enable
//             idleTime: 0, //in msec - master switch for slideshow / carousel - default "off"
//             slideTime: 0, //in msec - time between slides
//             menu: false, //Selector for links in the menu
//             addclass: "jqhover", //Class that gets added dynamically to the highlighted element in the slideshow
//             toggleSlide: false, //Toggle slide parameters - see below.  Default = off
         
//         /* script and style handling settings, prefetch */
//             deltas : false, // true = deltas loaded, false = all scripts loaded
//             asyncdef : true, // default async value for dynamically inserted external scripts, false = synchronous / true = asynchronous
//             alwayshints : "fontawesome", // strings, - separated by ", " - if matched in any external script URL - these are always loaded on every page load
//             inline : true, // true = all inline scripts loaded, false = only specific inline scripts are loaded
//             inlinehints : false, // strings - separated by ", " - if matched in any inline scripts - only these are executed - set "inline" to false beforehand
//             inlineskip : "adsbygoogle", // strings - separated by ", " - if matched in any inline scripts - these are NOT are executed - set "inline" to true beforehand 
//             inlineappend : false, // append scripts to the main content div, instead of "eval"-ing them
//             style : true, // true = all style tags in the head loaded, false = style tags on target page ignored
//             prefetch : false, // Plugin pre-fetches pages on hoverIntent
         
//         /* debugging & advanced settings*/
//             verbosity : 0,  //Debugging level to console: default off.  Can be set to 10 and higher (in case of logging enabled)
//             memoryoff : true, // strings - separated by ", " - if matched in any URLs - only these are NOT executed - set to "true" to disable memory completely
//             cb : function() {
//                 // formatTimeElements($("#ajaxy-content"))
//                 // $.material.init();
//             }, // callback handler on completion of each Ajax request - default null
//             pluginon : true // Plugin set "on" or "off" (==false) manually
//         }

//     $('#ajaxy-title, #ajaxy-content').ajaxify(options);
// });
