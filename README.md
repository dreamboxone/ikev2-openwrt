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
- رابط LuCI روسی و انگلیسی، همراه با ACME برای گواهی سرور ورودی.

## محدودیت و سازگاری

فقط firmware رسمی OpenWrt با firewall4/nftables، WAN دارای IPv4 و feedهای رسمی
پشتیبانی می‌شود. firmware سازنده، snapshot، firewall3 و feedهای نامنطبق پیش
از نصب dependency رد می‌شوند.

| نسخهٔ OpenWrt | قالب | وضعیت |
| --- | --- | --- |
| `24.10.x` | IPK با `opkg` | کد برنامه مستقل از معماری است؛ dependencyها باید با firmware روتر هماهنگ باشند. |
| `25.12.x` | APK با `apk` | APK به target و ABI دقیق وابسته است. |

در حال حاضر هدفی که باید با روتر واقعی تأیید شود Google WiFi (Gale) با
`25.12.5`، target `ipq40xx/chromium` و ARMv7
`arm_cortex-a7_neon-vfpv4` است. ARM64 شامل A53 و A72، MIPS و x86_64 به SDK و
تست جداگانه نیاز دارند؛ APK یک target را هرگز روی target دیگر نصب نکنید.

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
