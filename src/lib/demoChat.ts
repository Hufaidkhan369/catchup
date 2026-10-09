/**
 * Real, attributed sample used by the "Load real sample" button.
 *
 * Source: Ubuntu Chat Logs corpus, ConvoKit format, conversation 43.15.
 * https://convokit.cornell.edu/documentation/chatlogs.html
 * Licensed CC BY 4.0. Speaker handles are anonymized to role labels; original
 * message text is retained. Relative timestamps are shifted to now for the
 * catch-up window controls.
 */
import type { Message } from "../types";
import { MINUTE } from "./time";

type Raw = [minutesAfterStart: number, sender: string, text: string];
const CHAT_DURATION_MINUTES = 54;
const raw: Raw[] = [[0,"Requester","So I ran into a wifi pickle"],[1,"Requester","I think ubuntu during installation assinged my wifi chipset the wrong driver so now I can do wlan device up"],[1,"Requester","but when I try to scan it tells me the device doesn't support that"],[3,"Helper","what interface name(s) does \"iwconfig\" report with wireless extensions?"],[4,"Requester","that's the pickle, ifconfig shows the device, but neither lsusb, lspci or lshw actually show the name of the device"],[4,"Helper","we wouldn't expect them too - those are hardware tools"],[4,"Requester","from my google searches I get that it's most likely some realtek device that controls BT and wifi"],[4,"Requester","how would you go about finding out what driver do I actually need?"],[6,"Helper","well, if you want to identify the physical hardware behind the interace name I'd first do \"ll /sys/class/net/\""],[7,"Requester"," it shows the device wwan0 under usb1"],[9,"Helper","'wwan' is a cellular device usually, not WiFi. Is it WiMax?"],[10,"Helper","driver module should be found using something like \"ll /sys/class/net/wwan0/device/driver/module\""],[10,"Requester","well it's an x86 tablet that has 3G"],[10,"Requester","that means that I'm not able too see the wifi device at all"],[11,"Helper","So are you saying there is *no* Wifi device interface? In which case \"lshw -C net\" and look for any \"unclaimed\" device"],[12,"Helper","once you've found the device, depending on how it is connected to the PC, there are different ways of identifying it and the correct driver"],[13,"Requester","all I'm getting from lshw is that wwan0 device"],[13,"Helper","Either \"lspci -nnk\" or \"lsusb\" will show the detected devices. If those commands don't show the device then it is faulty or otherwise disabled. Does the tablet have some radio kill switch that disables it? Do you know 100% that the device has a WiFi device?"],[14,"Requester","Yes I'm 100% sure I had it working before"],[14,"Requester","I just can't remember where I got the driver"],[14,"Requester","and of course I forgot to back that stuff up"],[15,"Helper","You'd need to look at the /var/log/kern.log and look for signs of hardware that cannot be initialised"],[16,"Helper","but if it is connected via PCI or USB and isn't showing in the lsXXX outputs its not there physically as far as the kernel is concerned - those listings do not depend on a driver being available"],[16,"Requester","there is some realtek devices listed in lsusb"],[16,"Requester","but no model numbers"],[17,"Requester","escept for sd card reader"],[17,"Helper","the Vendor:Product IDs are all that is needed to identify devices"],[19,"Requester","all I get is 0bda:5875 Realtek Semiconductor Corp."],[19,"Requester","is the 0bda thing relevant?"],[20,"Helper","0bda is the Vendor, 5875 is the Product - those 2 are unique for every device, and are aliases drivers registes with the kernel to recognise which driver to call when a device is connected"],[21,"Helper","that's a USB camera though"],[22,"Requester","well I have 3 more realtek devices listed there"],[23,"Helper","tell us the Device IDs for each so we can check"],[23,"Requester","b720 and 5830"],[24,"Requester","the last one is listed as a sd card reader"],[25,"Helper","b720 looks like the RTL8723"],[25,"Requester","how do I know I have the AU or the BU version though?"],[26,"Helper","it looks as if the 'BU' also has Bluetooth"],[26,"Requester","that must be it then"],[27,"Helper","this looks like someone building an out-of-tree driver for that device: http://forum.xda-developers.com/showpost.php?p=62752007"],[28,"Requester","awesome, I'm going to try this out, thanks for your help"],[28,"Helper","the driver is here https://github.com/lwfinger/rtl8723bu"],[54,"Requester","got it to work, thanks"]];

export function buildDemoChat(now: number = Date.now()): Message[] {
  return raw.map(([minutesAfterStart, sender, text], index) => ({
    id: `ubuntu-sample-${index}`,
    sender,
    timestamp: now - (CHAT_DURATION_MINUTES - minutesAfterStart) * MINUTE,
    text,
    source: "demo",
    isSystem: false,
    mentions: [],
  }));
}