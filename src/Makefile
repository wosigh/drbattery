VERSION=0.1.3

# STAGING_DIR=/srv/preware/build/staging/i686
# CC=/srv/preware/build/toolchain/i686-unknown-linux-gnu/build/i686-unknown-linux-gnu/bin/i686-unknown-linux-gnu-gcc

STAGING_DIR=/srv/preware/build/staging/armv7
CC=/opt/PalmPDK/arm-gcc/bin/arm-none-linux-gnueabi-gcc

CPPFLAGS := -g -DVERSION=\"${VERSION}\" -I${STAGING_DIR}/usr/include/glib-2.0 -I${STAGING_DIR}/usr/lib/glib-2.0/include -I${STAGING_DIR}/usr/include
LDFLAGS  := -g -L${STAGING_DIR}/usr/lib -llunaservice -lmjson -lglib-2.0

drbattery: drbattery.o luna_service.o luna_methods.o

install: drbattery
#	- ssh root@webos killall de.somline.drbattery
	scp drbattery root@palm2:/var/usr/sbin/de.somline.drbattery.new
	ssh root@palm2 mv /var/usr/sbin/de.somline.drbattery.new /var/usr/sbin/de.somline.drbattery
	ssh root@palm2 killall de.somline.drbattery
#	novacom put file://home/root/drbattery < drbattery

clobber:
	rm -rf *.o drbattery
