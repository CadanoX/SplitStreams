#!/bin/bash
for filename in *.ttl; do
	echo "Converting file " $filename
	sed -i "s#\\\\\"#\\\\'#g" $filename
done
