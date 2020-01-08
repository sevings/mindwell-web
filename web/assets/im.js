class WebIM {
    tinode
    nameUids

    constructor() {
        this.nameUids = new Map()

        let host = document.location.host + "/tinode"
        let api_key = "AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K"
        let secure = document.location.protocol === "https:"
        let proto = (secure ? "wss" : "ws")
        this.tinode = new Tinode("MindwellWebIM", host, api_key, proto, secure, "web")
        this.tinode.enableLogging(true, true)

        let token = localStorage.getItem("tinode-token")
        if(token) {
            token = JSON.parse(token)
            token.expires = new Date(token.expires);
            this.tinode.setAuthToken(token);
        }

        this.tinode.onConnect = this.handleConnected.bind(this)
    }

    start() {
        this.tinode.connect()
            .catch((err) => { console.log(err) })
    }

    handleConnected() {
        let token = this.tinode.getAuthToken()
        if(token) {
            this.login("token", token.token)
        } else {
            $.ajax({
                method: "GET",
                url: "/account/subscribe/im",
                dataType: "json",
                success: (resp) => { this.login("rest", resp.token) },
            })
        }
    }

    login(method, token) {
        this.tinode.login(method, token).then((ctrl) => {
            if(ctrl.code === 200 && ctrl.text === "ok")
                this.handleLoginOk()
            else
                console.log("login:", ctrl.text)
        }).catch((err) => {
            console.log(err)
        })
    }

    handleLoginOk() {
        let token = this.tinode.getAuthToken()
        localStorage.setItem("tinode-token", JSON.stringify(token))

        this.initMe()
        this.initFind()

        setTimeout(() => { this.findUser("test1") }, 1000)
    }

    initMe() {
        let me = this.tinode.getMeTopic()
        me.onMetaDesc = this.handleMeMetaDesc.bind(this)
        me.onContactUpdate = this.handleMeContactUpdate.bind(this)
        me.onSubsUpdated = this.handleMeSubsUpdated.bind(this)

        let query = me.startMetaQuery()
            .withLaterSub()
            .withDesc()
            .withTags()
            .build()

        me.subscribe(query).catch((err) => { console.log("load me:", err) })
    }

    initFind() {
        let find = this.tinode.getFndTopic()
        find.onSubsUpdated = this.handleFindSubsUpdated.bind(this)
        if(find.isSubscribed()) {
            this.handleFindSubsUpdated()
        } else {
            let query = find.startMetaQuery().withSub().build()
            find.subscribe(query)
                .catch((err) => { console.log("init find:", err) })
        }
    }

    handleMeMetaDesc(desc) {
        if(!desc || !desc.public)
            return

        let me = desc.public
        this.nameUids[me.name] = this.tinode.getCurrentUserID()
        console.log("me:", me.id, me.name)
    }

    handleMeContactUpdate(what, cont) {
        console.log("contact:", what, cont)
    }

    handleMeSubsUpdated() {

    }

    handleFindSubsUpdated() {
        let foundUsers = []
        let find = this.tinode.getFndTopic()
        find.contacts((s) => { foundUsers.push(s) })

        console.log("found:", foundUsers)
    }

    findUser(name) {
        if(this.nameUids.has(name))
            return

        let find = this.tinode.getFndTopic()
        find.setMeta({desc: { public: "name:" + name }})
            .then(() => {
                let query = find.startMetaQuery().withSub().build()
                return find.getMeta(query)
            })
            // .then(() => { this.initFind() })
            .catch((err) => { console.log("load me:", err) })
    }
}

let im = new WebIM()
im.start()
