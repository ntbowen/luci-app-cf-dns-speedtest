# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 xiaokeikei

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Cloudflare DNS speed test and scoped mosdns integration
LUCI_DESCRIPTION:=Selects a Cloudflare IPv4 address and serves it only for configured domains through an isolated local mosdns instance.
LUCI_DEPENDS:=+luci-base +mosdns +cdnspeedtest
LUCI_MAINTAINER:=xiaokeikei

PKG_VERSION:=1.1.0
PKG_RELEASE:=2
PKG_LICENSE:=GPL-3.0-only
PKG_LICENSE_FILES:=LICENSE

define Package/luci-app-cf-dns-speedtest/conffiles
/etc/config/cf_dns_speedtest
endef

define Package/luci-app-cf-dns-speedtest/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
chmod 0755 /usr/bin/cf-dns-speedtest /etc/init.d/cf-dns-speedtest
/etc/init.d/cf-dns-speedtest enable
rm -f /tmp/luci-indexcache /tmp/luci-indexcache.* /tmp/luci-modulecache/* 2>/dev/null
/etc/init.d/rpcd reload 2>/dev/null
[ "$$(uci -q get cf_dns_speedtest.config.enabled)" = 1 ] && /usr/bin/cf-dns-speedtest apply >/dev/null 2>&1
exit 0
endef

define Package/luci-app-cf-dns-speedtest/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/cf-dns-speedtest stop 2>/dev/null
if [ -s /var/lib/cf-dns-speedtest/routes.active ]; then
  while IFS= read -r route; do uci -q del_list dhcp.@dnsmasq[0].server="$${route}"; done < /var/lib/cf-dns-speedtest/routes.active
fi
uci -q commit dhcp
sed -i '/# cf-dns-speedtest$$/d' /etc/crontabs/root
/etc/init.d/dnsmasq restart 2>/dev/null
exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
