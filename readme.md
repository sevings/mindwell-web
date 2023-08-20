# Build and run web
1. Install nginx (or use another reverse proxy):
```
sudo apt-get install nginx
sudo cp configs/nginx.sample.toml /etc/nginx/nginx.conf
sudo nano /etc/nginx/nginx.conf
sudo nginx -s reload
```
2. Add addresses to `/etc/hosts`:
```
sudo echo "127.0.0.1 mindwell.local" >> /etc/hosts
sudo echo "127.0.0.1 auth.mindwell.local" >> /etc/hosts
sudo echo "127.0.0.1 img.mindwell.local" >> /etc/hosts
```
3. Install Centrifugo 2.x:
```
wget https://github.com/centrifugal/centrifugo/releases/download/v2.8.6/centrifugo_2.8.6-0_amd64.deb
sudo dpkg -i centrifugo_2.8.6-0_amd64.deb
sudo nano /etc/centrifugo/config.json # add `port: 9000`
sudo systemctl restart centrifugo.service
nano ~/go/src/mindwell-server/configs/server.toml
# restart mindwell-server
```
4. Create Mindwell app:
```
cd ~/go/src/mindwell-server/
go run ./cmd/mindwell-helper/ webapp
```
5. Clone mindwell-web:
```
cd ~/go/src
git clone https://github.com/sevings/mindwell-web.git
cd mindwell-web
```
6. Configure:
```
cp configs/web.sample.toml configs/web.toml
nano configs/web.toml
```
7. Run web: `go run ./cmd/mindwell-web/`
