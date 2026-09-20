# مدیر IKEv2 برای OpenWrt

[English](README.en.md)

[![CI](https://github.com/dreamboxone/ikev2-openwrt/actions/workflows/ci.yml/badge.svg)](https://github.com/dreamboxone/ikev2-openwrt/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

یک برنامهٔ LuCI برای اتصال خروجی IKEv2، سرور اختیاری IKEv2 و مسیردهی انتخابی
ترافیک IPv4 در OpenWrt است. برنامه تنظیمات را در UCI نگه می‌دارد و strongSwan،
PBR، sing-box، dnsmasq و nftables را فقط پس از انتخاب صریح مدیر روتر پیکربندی
می‌کند.

## قابلیت‌ها

- اتصال خروجی IKEv2 از طریق XFRM با سه روش احراز هویت:
  EAP-MSCHAPv2، گواهی X.509 و EAP-TLS؛
- پیشنهادهای رمزنگاری AES-GCM-256 و AES-256/SHA-256 با گروه‌های PFS/DH سازگار؛
- ارسال سرویس‌ها، دامنه‌ها، IPv4 و CIDRهای انتخاب‌شده از VPN؛
- سیاست جداگانه برای هر دستگاه: فقط سرویس‌های انتخابی، همهٔ ترافیک از VPN،
  WAN مستقیم یا خارج‌کردن کامل از مدیریت برنامه؛
- مسیردهی دامنه با FakeIP/TProxy و حالت fail-closed: هنگام قطع تونل، ترافیک
  انتخاب‌شده به WAN نشت نمی‌کند؛
- DNS از UDP، TCP، DoT، DoH، HTTP/3، DoQ و DNSCrypt، همراه با bootstrap و
  fallback؛
- سرور ورودی IKEv2/EAP، کاربرهای مستقل و تعیین دسترسی هر کاربر به روتر،
  پورت‌های عمومی، اینترنت و شبکهٔ محلی؛
- ساخت profile برای Apple، Android و Windows VPNv2/NRPT؛
- کارت وضعیت در `Status → Overview` برای تونل، PBR و کاربران ورودی؛
- رابط LuCI فارسی، روسی و انگلیسی، همراه با ACME برای گواهی سرور ورودی.

## محدودیت و سازگاری

فقط firmware رسمی OpenWrt با firewall4/nftables، WAN دارای IPv4 و feedهای رسمی
پشتیبانی می‌شود. firmware سازنده، snapshot، firewall3 و feedهای نامنطبق پیش
از نصب dependency رد می‌شوند.

| روتر و نسخهٔ OpenWrt | فایل صحیح | وضعیت و اقدام کاربر |
| --- | --- | --- |
| firmware رسمی `24.10.x` با `opkg` و firewall4 | IPK | قالب برنامه مستقل از معماری است؛ پس IPK را نصب کنید، اما پیش از Apply اجازه دهید برنامه dependencyهای همان روتر را بررسی کند. |
| firmware رسمی `25.12.x` با `apk` و firewall4 | APK دقیق همان target/ABI | فقط APKی را نصب کنید که نام target، release و معماری آن با خروجی روتر یکسان است. |
| OpenWrt `23.05.x` و قدیمی‌تر | هیچ‌کدام | **ناسازگار و عمداً رد می‌شود.** ابتدا firmware رسمی را به نسخهٔ پشتیبانی‌شده ارتقا دهید. |
| snapshot، firmware سازنده، firewall3، یا feed غیررسمی | هیچ‌کدام | **ناسازگار و عمداً رد می‌شود.** firmware رسمی پایدار و feedهای رسمی لازم است. |
| APK برای target/ABI دیگر | هیچ‌کدام | **ناسازگار.** APK را نصب نکنید؛ SDK و خروجی مخصوص همان روتر لازم است. |

هدف آزمون عملی و APK پیش‌فرض، Google WiFi AC-1304 (Gale) با `25.12.5`، target
`ipq40xx/chromium` و ARMv7 `arm_cortex-a7_neon-vfpv4` است. برای هر روتر دیگر
در OpenWrt 25.12، workflow دستی **Build target APK**، SDK و checksum رسمیِ
همان `target/subtarget` را دریافت می‌کند، معماری واقعی را از SDK می‌خواند و
APK جداگانه می‌سازد. بنابراین ARM64، MIPS و x86_64 با نام معماری حدس زده
نمی‌شوند؛ target دقیق روتر معیار است. هر target تازه پیش از انتشار عمومی به
آزمون وابستگی و آزمون واقعی روتر نیاز دارد.

### تشخیص روتر پیش از دانلود

در SSH روتر این فرمان را اجرا کنید و خروجی را با نام فایل Release تطبیق دهید:

```sh
ubus call system board
cat /etc/openwrt_release
apk --print-arch 2>/dev/null || opkg print-architecture
```

فیلدهای `version`، `target` و `DISTRIB_ARCH` باید با APK دقیقاً هم‌خوان باشند.
اگر روتر `opkg` دارد، IPK را انتخاب کنید؛ اگر `apk` دارد، IPK را نصب نکنید.

## نصب

پیش از نصب از تنظیمات روتر backup بگیرید. نصب dependencyها فضای قابل توجهی
برای strongSwan، PBR، sing-box، `dnsmasq-full` و `dnsproxy` نیاز دارد.

### OpenWrt 24.10: IPK

آخرین فایل `luci-app-ikev2-manager_*_all.ipk` را از
[Releases](https://github.com/dreamboxone/ikev2-openwrt/releases) بگیرید.

از LuCI:

1. `System → Software → Upload Package` را باز کنید.
2. IPK را انتخاب و نصب کنید.
3. به `Services → IKEv2 Manager → Setup` بروید.

یا در SSH:

```sh
scp -O luci-app-ikev2-manager_*_all.ipk root@ROUTER:/tmp/
scp -O scripts/install.sh root@ROUTER:/tmp/
ssh root@ROUTER
chmod +x /tmp/install.sh
/tmp/install.sh /tmp/luci-app-ikev2-manager_*_all.ipk
```

### OpenWrt 25.12: APK

فقط APK ساخته‌شده برای همان release، target و architecture روتر را دانلود
کنید. SHA-256 منتشرشده کنار Release را پیش از نصب بررسی کنید. APKهای انتشار
عمداً امضا نشده‌اند، بنابراین نصب به `--allow-untrusted` نیاز دارد:

```sh
apk add --allow-untrusted /tmp/luci-app-ikev2-manager_*.apk
```

IPK و APK قابل جایگزینی با هم نیستند. از `apk upgrade` بدون نام بسته استفاده
نکنید؛ ممکن است kernel moduleهای نامرتبط روتر را تغییر دهد.

## راه‌اندازی اولیه در LuCI

1. به `Services → IKEv2 Manager → Setup` بروید و `Install dependencies` را
   بزنید. برنامه ابتدا release، feedها، فضای ذخیره‌سازی و سازگاری dependencyها
   را بررسی می‌کند.
2. پس از تکمیل، WAN و شبکه‌های داخلی محافظت‌شده را انتخاب کنید، سپس managed
   mode را فعال و Apply کنید.
3. در `Client`، آدرس یا hostname سرور، `Remote ID` و روش احراز هویت را وارد
   کنید:
   - **EAP-MSCHAPv2:** نام کاربری و گذرواژه؛
   - **Certificate (X.509):** مسیر گواهی و کلید خصوصی PEM روی روتر؛
   - **EAP-TLS:** مسیر گواهی و کلید خصوصی PEM روی روتر.
4. برای اعتبارسنجی سرور، CA موردنیاز را در همان صفحه تعیین کنید. از خاموش‌کردن
   بررسی گواهی صرفاً برای عبور از خطا خودداری کنید.
5. `Save & Apply` و سپس `Connect` را بزنید. نتیجه در کارت وضعیت Client و
   `Status → Overview` دیده می‌شود.

تا وقتی اتصال خروجی سالم نشده است، دامنه یا دستگاهی را به سیاست VPN اضافه
نکنید. نخست یک اتصال و یک مقصد آزمایشی را بررسی کنید.

## راهنمای کامل تب‌ها و گزینه‌ها

### ۱. Overview — آماده‌سازی و وضعیت کلی

این صفحه نقطهٔ شروع هر نصب است. تا وقتی کارت‌های بررسی سبز نشده‌اند، managed
mode را فعال نکنید.

| گزینه | کاربرد | نکتهٔ عملی |
| --- | --- | --- |
| **Install dependencies** | وابستگی‌های نبودۀ VPN، DNS و PBR را نصب می‌کند. | ممکن است برای جایگزینی `dnsmasq-full`، DNS/DHCP برای چند لحظه restart شود. پیش از زدن دکمه، اتصال LuCI خود را از یک شبکهٔ پایدار نگه دارید. |
| **Tunnel routing: Pause/Resume** | Pause مسیر انتخاب‌شده را موقتاً از VPN به WAN می‌فرستد، بدون حذف تنظیمات. | در حالت Pause تضمین fail-closed وجود ندارد؛ فقط برای عیب‌یابی یا دسترسی اضطراری استفاده کنید. Resume همان سیاست قبلی را بازمی‌گرداند. |
| **WAN network** | رابط اینترنت اصلی روتر را مشخص می‌کند. | باید همان uplink واقعی باشد. در سرور ورودی، UDP 500 و 4500 روی همین WAN استفاده می‌شوند. |
| **Protected networks** | شبکه‌های LAN/VLAN که سیاست دامنه و VPN روی آن‌ها اعمال می‌شود. | WAN یا شبکهٔ مدیریت بیرونی را به‌عنوان protected انتخاب نکنید. |
| **Managed mode** | مالکیت route، PBR، DNS و firewall موردنیاز برنامه را فعال می‌کند. | پیش از حذف برنامه یا تغییر عمدهٔ شبکه آن را خاموش کنید. |
| **Device rules** | فهرست دستگاه‌های LAN و استثناءهای آن‌ها را نشان می‌دهد. | هر استثناء می‌تواند PBR، رهگیری DNS و DPI را جداگانه دور بزند. |
| **Redirect plain DNS** | TCP/UDP پورت 53 دستگاه‌های protected را به DNS روتر هدایت می‌کند. | برای کارکرد مسیردهی دامنه مفید است؛ اگر resolver محلی خاص دارید، ابتدا سازگاری آن را بررسی کنید. |
| **Block DNS-over-TLS** | خروجی پورت 853 به WAN را block می‌کند. | از دور زدن دسته‌بندی دامنه با DoT جلوگیری می‌کند، اما بعضی کلاینت‌ها را تحت‌تأثیر می‌گذارد. |
| **Reset application** | برنامه را برای حذف آماده می‌کند، state مدیریت‌شده را برمی‌گرداند و وابستگی‌های مالکیت‌دار را پاک می‌کند. | تنظیمات، کاربرها و secretها پاک می‌شوند؛ قبل از اجرا backup بگیرید. بسته‌های مشترک موردنیاز نرم‌افزارهای دیگر نگه داشته می‌شوند. |

**Runtime dependencies** فقط وضعیت را نشان می‌دهد. اگر نسخه‌های strongSwan به‌صورت
ناهمگون نصب شده باشند، برنامه عمداً آن‌ها را مخلوط نمی‌کند؛ ابتدا firmware و
feedهای رسمی را درست کنید.

### ۲. Outbound Tunnel — اتصال این روتر به سرور IKEv2

این تب فقط برای اتصال **روتر به سرور VPN** است؛ با تب Inbound Server اشتباه
نگیرید. ترتیب امن پیکربندی: آدرس سرور، شناسه، روش احراز هویت، CA، ذخیره، سپس
Connect.

| گزینه | مقدار/رفتار | انتخاب پیشنهادی |
| --- | --- | --- |
| **Enabled** | اجازه می‌دهد health watcher بعد از boot و قطع WAN اتصال را بازیابی کند. | پس از یک اتصال دستی موفق روشن کنید. |
| **Remote address** | IPv4 یا hostname سرور IKEv2. | hostname باید از خود روتر resolve شود. |
| **Remote ID** | هویت مورد انتظار سرور در گواهی IKEv2. | معمولاً FQDN گواهی سرور است، نه لزوماً IP. |
| **EAP username / Password** | secret روش EAP-MSCHAPv2. | گذرواژه در UI فقط برای تغییر نوشته می‌شود؛ خالی گذاشتن آن secret قبلی را حفظ می‌کند. |
| **Authentication method** | `EAP-MSCHAPv2`، `Certificate (X.509)` یا `EAP-TLS`. | فقط روشی را انتخاب کنید که سرور واقعاً فعال کرده است. |
| **Client certificate path / private key path** | مسیر فایل PEM روی خود روتر برای Certificate و EAP-TLS. | فایل‌ها باید پیش از Apply روی روتر موجود و خواندنی باشند؛ مسیر فایل لپ‌تاپ قابل استفاده نیست. |
| **CA certificate / identity** | ریشهٔ اعتماد و هویت مورد انتظار gateway. | بررسی گواهی را دور نزنید؛ خطای CA را با chain صحیح سرور حل کنید. |
| **DPD، MTU، rekey و reauth** | تایمر زنده‌بودن، اندازهٔ بسته و زمان نوسازی SA. | مقادیر recommended را تغییر ندهید مگر سرور یا شبکه دلیل مشخصی داشته باشد. MTU کوچک‌تر برای شبکه‌های محدود مفید است. |
| **Custom strongSwan config** | generated profile را با تنظیم خام جایگزین می‌کند. | فقط کاربر متخصص؛ در این حالت فرم عادی در runtime اثر ندارد تا Reset to generated را بزنید. |
| **Connect / Disconnect** | اتصال یا خاتمهٔ SA خروجی. | Connect ابتدا اعتبارسنجی را اجرا می‌کند و علت‌هایی مانند certificate، proposal یا DNS را گزارش می‌دهد. |

#### Tunnel DNS و Destination DNS segments

`Tunnel DNS` نام‌های مقصدهای VPN را از داخل تونل resolve می‌کند. اولین endpoint
اصلی و بقیه fallback ترتیبی‌اند. bootstrap باید IPهای IPv4 معتبر پورت 53 باشد تا
خود resolver برای پیدا کردن resolver دیگری به DNS عمومی وابسته نشود.

`Destination DNS segments` برای suffixهای مشخص (مثلاً یک دامنهٔ سازمانی) گروه
resolver مستقل می‌سازد. در هر segment نام، suffixها، protocol، upstream،
bootstrap، fallback و حالت load-balance/ordered را وارد کنید. segment با suffix
متداخل با segment دیگر رد می‌شود. تغییر segment فقط همان segment را Apply کنید.

### ۳. Policy Routing — چه چیزی از VPN عبور کند

این تب **سرور VPN را تغییر نمی‌دهد**؛ فقط تصمیم می‌گیرد ترافیک protected LAN به
کدام مقصدها وارد `ipsec-out` شود.

| بخش | شرح و روش استفاده |
| --- | --- |
| **Domain routing engine** | Standard mode دامنه را با IP عمومی آن دسته‌بندی می‌کند. Reliable mode از FakeIP/TProxy استفاده می‌کند و با تغییر IP مقصد پایدارتر است. برای سرویس‌هایی با CDN یا IP متغیر، Reliable را انتخاب کنید. |
| **Route router services by domain policy** | در Reliable mode، درخواست‌های خود روتر به دامنه‌های انتخاب‌شده را نیز از تونل می‌برد. آدرس‌های مدیریت محلی و transport تونل مستقیم می‌مانند. |
| **Logging** | Errors only و Warnings برای استفادهٔ روزمره مناسب‌اند. Information/Debug/Trace log ring روتر را سریع پر می‌کنند. Capture debug log فقط ۶۰ ثانیه است و بعد سطح قبلی را برمی‌گرداند. |
| **Services** | chip سرویس را انتخاب کنید و سپس Save صفحه را بزنید؛ انتخاب chip به‌تنهایی policy را اعمال نمی‌کند. گزینهٔ broad ممکن است سایت‌های نامرتبط را هم route کند. |
| **Manage services** | service آماده را inspect/edit می‌کند یا service جدید می‌سازد. Identifier فقط حروف کوچک، رقم و underscore دارد و بعداً تغییر نمی‌کند. برای هر دامنه یا IPv4/CIDR یک خط وارد کنید. Restore prepared service فقط override محلی را حذف می‌کند. |
| **Custom domains** | هر خط یک suffix ساده مانند `example.com` است؛ subdomainها خودکار شامل می‌شوند. این فهرست با update سرویس‌ها overwrite نمی‌شود. |
| **Custom IPv4 addresses and networks** | هر خط یک IPv4 یا CIDR مانند `203.0.113.5` یا `203.0.113.0/24` است و بدون DNS کار می‌کند. شبکهٔ بسیار broad وارد نکنید. |
| **Router traffic** | مشخص می‌کند ترافیک خود روتر از سیاست دامنه تبعیت کند یا مستقیم بماند. قبل از فعال‌کردن، اطمینان حاصل کنید endpoint تونل و نشانی مدیریت روتر در policy نیستند. |

پس از Save، کارت policy را بررسی کنید. اگر تونل قطع باشد، مقصدهای انتخاب‌شده در
حالت عادی block می‌شوند؛ این نشانهٔ خطا نیست، رفتار fail-closed است.

### ۴. Inbound Server — اتصال دستگاه‌های بیرونی به این روتر

این تب اختیاری است. فقط وقتی لازم است که موبایل، لپ‌تاپ یا کاربر بیرونی به
**خود روتر** وصل شود آن را فعال کنید. برای استفادهٔ صرف از تونل خروجی، آن را
خاموش نگه دارید.

| گزینه | کاربرد |
| --- | --- |
| **Enabled / Public identity** | فعال‌سازی سرور و نام DNS عمومی موجود در گواهی. باید از اینترنت به WAN روتر برسد. |
| **Client IPv4 pool / Pool gateway** | محدودهٔ IP اختصاصی کاربران ورودی و gateway رابط `ipsec-in`. با LAN، WAN یا pool دیگر overlap نداشته باشد. |
| **DNS for VPN clients** | DNSی که به کلاینت ورودی داده می‌شود. معمولاً IP روتر یا resolver مورد اعتماد است. |
| **Traffic selectors** | تعیین می‌کند کاربر ورودی all IPv4 traffic را از تونل بفرستد یا فقط شبکه‌های داخلی روتر را ببیند. |
| **Router/WAN zones** | zoneهای firewall خودکارند؛ فقط در topology غیرعادی آن‌ها را تغییر دهید. |
| **MTU، DPD، rekey، reauth** | رفتار session ورودی. recommendedها برای حالت معمول مناسب‌اند. |
| **Global access policy** | default دسترسی همهٔ کاربران به روتر، پورت‌های عمومی، اینترنت و LAN است؛ تب Users می‌تواند برای یک کاربر override بسازد. |
| **Edit raw config** | کل profile generated را جایگزین می‌کند. در custom mode، فرم عادی فقط ذخیره می‌شود و runtime را تغییر نمی‌دهد. Reset to generated برای بازگشت است. |

#### ACME certificate

برای اعتماد دستگاه‌ها به سرور ورودی گواهی معتبر لازم است. در DNS-01، provider و
credential API را وارد کنید؛ برای provider چندمتغیره هر `VAR="value"` یک خط
است. در HTTP-01، پورت ورودی 80 باید از اینترنت به روتر برسد. ابتدا `Save ACME
settings` و سپس `Request certificate` را بزنید. staging فقط آزمایش است و
دستگاه‌های عادی آن را trusted نمی‌دانند.

### ۵. VPN Users — کاربران سرور ورودی

این تب فقط با Inbound Server فعال معنی دارد.

| گزینه | کاربرد |
| --- | --- |
| **Add user** | نام کاربری با حرف، عدد، نقطه، خط تیره یا underscore و گذرواژه می‌سازد. برای هر دستگاه حساب جدا بسازید. |
| **Access policy** | `Use global setting` از policy سرور ارث می‌برد؛ Allow/Deny آن بخش را برای همان کاربر تغییر می‌دهد. |
| **Router access** | دسترسی کاربر به خود روتر. DNS همچنان ممکن است در دسترس بماند. |
| **Public router ports** | TCP/UDPهای عمومی مجاز؛ پورت یا بازه را با space/comma جدا کنید. این گزینه حتی اگر Router access deny باشد می‌تواند پورت مشخص را باز کند. |
| **Internet access** | اجازهٔ خروج عادی به WAN و مقصدهای مجاز پروژه. |
| **Local network access** | All local networks، Only selected addresses/CIDR، یا Deny. در حالت limited حداقل یک IPv4/CIDR معتبر لازم است. |
| **PBR participation** | کاربر از policy پروژه پیروی کند یا Direct WAN باشد. Direct WAN، policy دامنه پروژه را برای همان کاربر bypass می‌کند. |
| **Download iOS/Windows/Android profile** | profile همان کاربر را می‌سازد. فایل Apple/Android شامل گذرواژه است؛ آن را مثل secret نگه دارید و پس از import حذف کنید. |
| **Change password / Delete / Disconnect** | secret را جایگزین، کاربر را حذف، یا session فعال را قطع می‌کند. حذف کاربر دسترسی آینده را می‌بندد. |
| **Capture for 60 seconds** | trace کوتاه strongSwan برای خطای اتصال ورودی می‌گیرد؛ پس از پایان خودکار متوقف می‌شود. |

## ترتیب پیشنهادی برای استفادهٔ روزمره

1. Overview: dependencyها، WAN و protected networkها را تنظیم کنید.
2. Outbound Tunnel: ابتدا یک اتصال EAP-MSCHAPv2 یا certificate را دستی تست کنید.
3. Policy Routing: یک domain/CIDR کوچک اضافه و نتیجه را آزمایش کنید.
4. فقط در صورت نیاز Inbound Server و سپس Users را فعال کنید.
5. پس از هر تغییر مهم، `doctor` و `swanctl --list-sas` را بررسی کنید.

## مسیردهی و DNS

- برای دامنه‌ها، کلاینت‌های LAN باید DNS روتر را استفاده کنند. Browser DoH،
  Android Private DNS و Apple Private Relay می‌توانند دسته‌بندی دامنه را دور
  بزنند.
- آیتم‌های IPv4 و CIDR بدون DNS کار می‌کنند.
- در حالت fail-closed، قطع‌شدن IKEv2 باعث block شدن ترافیک انتخاب‌شده می‌شود؛
  باقی ترافیک از WAN می‌رود.
- DoH اول در فهرست تونل DNS، primary است؛ موارد بعدی فقط fallback ترتیبی‌اند.
  برنامه برای مقصدهای انتخاب‌شده مسیر DNS را خودکار به WAN برنمی‌گرداند.
- تغییر دامنه، CIDR یا سیاست دستگاه را با Save صفحهٔ مربوطه اعمال کنید؛ سپس
  کارت وضعیت PBR را بررسی کنید.

## سرور ورودی و کاربرها

بخش `Settings` برای سرور ورودی است. ابتدا نام عمومی سرور، pool آدرس، شبکه‌های
مجاز و گواهی معتبر را تعیین کنید. برای گواهی می‌توان از ACME استفاده کرد.
سپس در `Users`، کاربر و گذرواژه و policy او را بسازید و profile مناسب دستگاه
کاربر را دانلود کنید.

فعال‌کردن سرور بدون گواهی معتبر باعث اتصال ناامن یا ناموفق کاربران می‌شود.
هر دستگاه ورودی باید حساب EAP جداگانه داشته باشد؛ یک نام کاربری را بین چند
دستگاه به اشتراک نگذارید.

## بررسی و عیب‌یابی

در SSH روتر:

```sh
/usr/libexec/ikev2-manager-system doctor
/usr/libexec/ikev2-manager overview
/usr/libexec/ikev2-manager-system failclosed-check
/usr/libexec/ikev2-domain-router status
/usr/libexec/ikev2-user-policy check
/etc/init.d/pbr status
swanctl --list-sas
```

نشانه‌های اتصال سالم خروجی شامل CHILD_SA با نام `proxy4`، آدرس مجازی روی
`ipsec-out` و اجرای PBR/FakeIP/health است. اگر اتصال برقرار نشد، ابتدا
hostname و Remote ID، CA، تاریخ روتر، روش احراز هویت و logهای strongSwan را
بررسی کنید؛ سپس dependencyها را بدون تغییر نسخه‌های موجود repair کنید.

## به‌روزرسانی و حذف

نصب نسخهٔ جدید IPK یا APK، تنظیمات، کاربرها، گواهی‌ها و فهرست‌های شخصی را حفظ
می‌کند. پیش از حذف کامل، managed mode را در LuCI غیرفعال کنید تا route، PBR،
DNS و firewall به وضعیت پیشین بازگردند. حذف بسته برای پاکسازی امن نیازمند
موفقیت helper داخلی است؛ در صورت خطا، ابتدا `doctor` را اجرا کنید.

## ساخت از سورس

```sh
./scripts/ci-check.sh
```

IPK در `dist/` ساخته می‌شود. برای APK به SDK رسمی دقیق همان target نیاز است؛
جزئیات در [OpenWrt 25.12 و APK](docs/OPENWRT25.md) آمده است.

## مستندات

- [نقشهٔ مخزن](docs/MAP.md)
- [عملیات و تشخیص خطا](docs/OPERATIONS.md)
- [سازگاری OpenWrt 25.12 و APK](docs/OPENWRT25.md)
- [معماری](docs/ARCHITECTURE.md)
- [NOTICE برای فهرست‌های خارجی](NOTICE)

## مجوز

این پروژه تحت [MIT License](LICENSE) منتشر شده است. شرایط فهرست‌های اختیاری
دریافت‌شده از بیرون پروژه در [NOTICE](NOTICE) توضیح داده شده‌اند.
