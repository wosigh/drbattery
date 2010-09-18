/*=============================================================================
 Copyright (C) 2010 WebOS Internals <support@webos-internals.org>

 Adoption for Dr. Battery by somline
 Copyright (C) 2010 Somline <drbattery@somline.de>

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 2
 of the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 =============================================================================*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "luna_service.h"
#include "luna_methods.h"

#define ALLOWED_CHARS "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-"
//#define ALLOWED_CHARS "0123456789"

#define API_VERSION "1"

#define BUSMASTER_DIR				"/sys/devices/w1_bus_master1/"
#define W1_MASTER_SLAVES_FILE		"w1_master_slaves"
#define W1_MASTER_SLAVE_COUNT_FILE	"w1_master_slave_count"
#define DUMPREG_FILE				"/dumpreg"
#define SETREG_FILE					"/setreg"

#define SIGN_EXTEND16(x)		(((long)(x))-(((x)&0x8000)?65536:0))
#define CURRENT_VALUE(x,rsense)	((SIGN_EXTEND16(x)*3125)/2/rsense) // in uA 
// Bug in driver? In manual we have 4.885mV units
//#define VOLTAGE_VALUE(x)		(4885*((x)>>5)) // in micro volt
#define VOLTAGE_VALUE(x)		(4880*((x)>>5)) // in micro volt
#define COULOMB_VALUE(x,rsense)	((6250*SIGN_EXTEND16(x))/((s32) rsense))
#define REG_COULOMB_VALUE(x,rsense)	((rsense*SIGN_EXTEND16(x))/6250)

#define CAPACITY_VALUE(x)		(1600*SIGN_EXTEND16(x))      // in micro Ahr
#define CAPACITY_VALUE_MA(x)	((1000*SIGN_EXTEND16(x))/625)      // in m Ahr
#define CAPACITY_PERCENT(x)		(392*x)		// in thousands of %

// Relative Register Addresses
// 0x00 - 0x0F
// Remaining Active Relative Capacity
#define STATUS_ADDRESS			0x01
#define RAAC_MSB_ADDRESS		0x02
#define RAAC_LSB_ADDRESS		0x03
#define RARC_ADDRESS			0x06
#define AVGCURRENT_MSB_ADDRESS	0x08
#define AVGCURRENT_LSB_ADDRESS	0x09
#define TEMP_MSB_ADDRESS		0x0a
#define TEMP_LSB_ADDRESS		0x0b
#define VOLTAGE_MSB_ADDRESS		0x0c
#define VOLTAGE_LSB_ADDRESS		0x0d
#define CURRENT_MSB_ADDRESS		0x0e
#define CURRENT_LSB_ADDRESS		0x0f

// 0x10 - 0x1F
#define AGE_ADDRESS				0x04
// 0x60 - 0x6F
#define VAE_ADDRESS				0x06
#define RSENSE_ADDRESS			0x09
#define FULL_MSB_ADDRESS		0x0a
#define FULL_LSB_ADDRESS		0x0b

// Offset into Dumpreg
#define ADDRESS_OFFSET	3

//Status register
#define CHGTF  0x80
#define AEF    0x40
#define SEF    0x20
#define LEARNF 0x10
#define UVF    0x04
#define PORF   0x02

#define AGE_REGISTER			0x14
#define VAE_REGISTER			0x66
#define Full40MSB_REGISTER		0x6a  
#define Full40LSB_REGISTER		0x6b
#define STATUS_REGISTER			0x01
/*
 \n
 00: 0f 01 01 18 01 20 2e 2e fe 9d 1d 20 61 00 fe 95\n
 10: 05 d5 78 30 6f 6e 7f e2 01 ea 00 9c ff ff ff 00\n
 20: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00\n
 60: 62 ff 0b 80 d5 16 ae 05 0a 32 0e 60 01 05 0b 23\n
 70: 07 0f 22 66 07 08 08 08 04 00 00 00 1e 14 0a 1a\n
 b0: 04 18\n
*/ 
struct structDumpreg { 
	unsigned char HeadRange0x00[5];	
	unsigned char Range0x00[47];		
	unsigned char HeadRange0x10[5];
	unsigned char Range0x10[47];
	unsigned char HeadRange0x20[5];
	unsigned char Range0x20[47];
	unsigned char HeadRange0x60[5];
	unsigned char Range0x60[47];
	unsigned char HeadRange0x70[5];
	unsigned char Range0x70[47];
	unsigned char HeadRange0xb0[5];
	unsigned char Range0xb0[5];
	unsigned char Tail;
	
};
static struct structDumpreg Dumpreg;

struct structMemoryMap {
	double age;
	double full40;
	int rsense;
	int temp;
	long voltage;
	long current;
	long avgcurrent;
	int percent;
	double coulomb;
	char strCHGTF[6];
	char strAEF[6];
	char strSEF[6];
	char strLEARNF[6];
	char strUVF[6];
	char strPORF[6];
	double vae;
};
static struct structMemoryMap MemoryMap;

//
// We use static buffers instead of continually allocating and deallocating stuff,
// since we're a long-running service, and do not want to leak anything.
//
//static char buffer[MAXBUFLEN];
static char esc_buffer[MAXBUFLEN];
//static char run_command_buffer[MAXBUFLEN];
// Buffer for file readings
static char read_file_buffer[1024];
// Buffer for error messages in file IO
static char error_file_buffer[1024];
// Initialize once to get the w1 slave name
static bool	is_initialized = false;
// full quallified filename of dumpreg
static char battery_dumpreg_file[PATH_MAX];
static char battery_setreg_file[PATH_MAX];
//
// Escape a string so that it can be used directly in a JSON response.
// In general, this means escaping quotes, backslashes and control chars.
// It uses the static esc_buffer, which must be twice as large as the
// largest string this routine can handle.
//
static char *json_escape_str(char *str)
{
  const char *json_hex_chars = "0123456789abcdef";

  // Initialise the output buffer
  strcpy(esc_buffer, "");

  // Check the constraints on the input string
  if (strlen(str) > MAXBUFLEN) return (char *)esc_buffer;

  // Initialise the pointers used to step through the input and output.
  char *resultsPt = (char *)esc_buffer;
  int pos = 0, start_offset = 0;

  // Traverse the input, copying to the output in the largest chunks
  // possible, escaping characters as we go.
  unsigned char c;
  do {
    c = str[pos];
    switch (c) {
    case '\0':
      // Terminate the copying
      break;
    case '\b':
    case '\n':
    case '\r':
    case '\t':
    case '"':
    case '\\': {
      // Copy the chunk before the character which must be escaped
      if (pos - start_offset > 0) {
	memcpy(resultsPt, str + start_offset, pos - start_offset);
	resultsPt += pos - start_offset;
      };
      
      // Escape the character
      if      (c == '\b') {memcpy(resultsPt, "\\b",  2); resultsPt += 2;} 
      else if (c == '\n') {memcpy(resultsPt, "\\n",  2); resultsPt += 2;} 
      else if (c == '\r') {memcpy(resultsPt, "\\r",  2); resultsPt += 2;} 
      else if (c == '\t') {memcpy(resultsPt, "\\t",  2); resultsPt += 2;} 
      else if (c == '"')  {memcpy(resultsPt, "\\\"", 2); resultsPt += 2;} 
      else if (c == '\\') {memcpy(resultsPt, "\\\\", 2); resultsPt += 2;} 

      // Reset the start of the next chunk
      start_offset = ++pos;
      break;
    }

    default:
      
      // Check for "special" characters
      if ((c < ' ') || (c > 127)) {

	// Copy the chunk before the character which must be escaped
	if (pos - start_offset > 0) {
	  memcpy(resultsPt, str + start_offset, pos - start_offset);
	  resultsPt += pos - start_offset;
	}

	// Insert a normalised representation
	sprintf(resultsPt, "\\u00%c%c",
		json_hex_chars[c >> 4],
		json_hex_chars[c & 0xf]);

	// Reset the start of the next chunk
	start_offset = ++pos;
      }
      else {
	// Just move along the source string, without copying
	pos++;
      }
    }
  } while (c);

  // Copy the final chunk, if required
  if (pos - start_offset > 0) {
    memcpy(resultsPt, str + start_offset, pos - start_offset);
    resultsPt += pos - start_offset;
  } 

  // Terminate the output buffer ...
  memcpy(resultsPt, "\0", 1);

  // and return a pointer to it.
  return (char *)esc_buffer;
}

//
// A dummy method, useful for unimplemented functions or as a status function.
// Called directly from webOS, and returns directly to webOS.
//
bool dummy_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  sprintf(error_file_buffer,
		"{\"returnValue\": true, \"initialized\": %s}",
		  (is_initialized)?"true":"false");
	
  if (!LSMessageReply(lshandle, message, error_file_buffer, &lserror)) goto error;

  return true;
 error:
  LSErrorPrint(&lserror, stderr);
  LSErrorFree(&lserror);
 end:
  return false;
}

//
// Return the current API version of the service.
// Called directly from webOS, and returns directly to webOS.
//
bool version_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  if (!LSMessageReply(lshandle, message, "{\"returnValue\": true, \"version\": \"" VERSION "\", \"apiVersion\": \"" API_VERSION "\"}", &lserror)) goto error;

  return true;
 error:
  LSErrorPrint(&lserror, stderr);
  LSErrorFree(&lserror);
 end:
  return false;
}

//
// A function pointer, used to filter output messages from commands.
// The input string is assumed to be a buffer large enough to hold
// the filtered output string, and is forcibly overwritten.
// The return value says whether this message should be considered
// to be an immediate terminating error condition from the command.
//
typedef bool (*subscribefun)(char *);

//
// Pass through all messages unchanged.
//
static bool passthrough(char *message) {
  return true;
}

static bool read_first_line_from_textfile(char *filename) {
	FILE * file = fopen(filename, "r");
	if (!file) {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Cannot open %s\"}",
				filename);
		return false;
	}
	if (!fgets(read_file_buffer,CHUNKSIZE,file)) {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Error reading %s\"}",
				filename);
		return false;
	};
	fclose(file);
	if (strlen(read_file_buffer) > 1) {
		if (read_file_buffer[strlen(read_file_buffer)-1]=='\n') {
			read_file_buffer[strlen(read_file_buffer)-1]='\0';
		}
	}
	return true;
}

bool InitBatteryDir() {
	if (is_initialized) { 
		return true; 
	}
	char tmp_path[PATH_MAX];
	strcpy(tmp_path,BUSMASTER_DIR);
	strcat(tmp_path,W1_MASTER_SLAVES_FILE);
	if (!read_first_line_from_textfile(tmp_path)) {
		return false;
	}
	strcpy(battery_dumpreg_file,BUSMASTER_DIR);
	strcat(battery_dumpreg_file,read_file_buffer);
	strcpy(battery_setreg_file,battery_dumpreg_file);
	strcat(battery_dumpreg_file,DUMPREG_FILE);
	strcat(battery_setreg_file,SETREG_FILE);
	
	//strcpy(battery_setreg_file,"/tmp/setreg");
	
	is_initialized = true;
	return true;
}

static bool fill_memory_map() {
	char tmp_str[5];

	if (!InitBatteryDir()) {
		return false;
	}
	
	// Rsense
	strncpy(tmp_str,Dumpreg.Range0x60 + (RSENSE_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[2]='\0';	
	MemoryMap.rsense = 1000 / (int)strtol(tmp_str,NULL,16);	
	// Age
	strncpy(tmp_str,Dumpreg.Range0x10 + (AGE_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[2]='\0';	
	MemoryMap.age = strtol(tmp_str,NULL,16) / 1.28;
	// Full40
	strncpy(tmp_str,Dumpreg.Range0x60 + (FULL_MSB_ADDRESS * ADDRESS_OFFSET),2);
	strncpy(tmp_str+2,Dumpreg.Range0x60 + (FULL_LSB_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[4]='\0';	
	MemoryMap.full40 = ((strtol(tmp_str,NULL,16) * 25000L) >> 2) / MemoryMap.rsense / 1000.;
	// Temp
	strncpy(tmp_str,Dumpreg.Range0x00 + (TEMP_MSB_ADDRESS * ADDRESS_OFFSET),2);
	//strncpy(tmp_str+2,Dumpreg.Range0x60 + (FULL_LSB_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[2]='\0';	
	MemoryMap.temp = (int)(strtol(tmp_str,NULL,16));
	// Voltage
	strncpy(tmp_str,Dumpreg.Range0x00 + (VOLTAGE_MSB_ADDRESS * ADDRESS_OFFSET),2);
	strncpy(tmp_str+2,Dumpreg.Range0x00 + (VOLTAGE_LSB_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[4]='\0';	
	MemoryMap.voltage = VOLTAGE_VALUE(strtol(tmp_str,NULL,16));
	// Current
	strncpy(tmp_str,Dumpreg.Range0x00 + (CURRENT_MSB_ADDRESS * ADDRESS_OFFSET),2);
	strncpy(tmp_str+2,Dumpreg.Range0x00 + (CURRENT_LSB_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[4]='\0';	
	MemoryMap.current = CURRENT_VALUE(strtol(tmp_str,NULL,16),MemoryMap.rsense);
	// Average Current
	strncpy(tmp_str,Dumpreg.Range0x00 + (AVGCURRENT_MSB_ADDRESS * ADDRESS_OFFSET),2);
	strncpy(tmp_str+2,Dumpreg.Range0x00 + (AVGCURRENT_LSB_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[4]='\0';	
	MemoryMap.avgcurrent = CURRENT_VALUE(strtol(tmp_str,NULL,16),MemoryMap.rsense);
	// Rarc
	strncpy(tmp_str,Dumpreg.Range0x00 + (RARC_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[2]='\0';	
	MemoryMap.percent = (int)strtol(tmp_str,NULL,16);	
	// coulomb
	strncpy(tmp_str,Dumpreg.Range0x00 + (RAAC_MSB_ADDRESS * ADDRESS_OFFSET),2);
	strncpy(tmp_str+2,Dumpreg.Range0x00 + (RAAC_LSB_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[4]='\0';	
	MemoryMap.coulomb = 1.6 * (strtol(tmp_str,NULL,16));
	// Status Register
	strncpy(tmp_str,Dumpreg.Range0x00 + (STATUS_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[2]='\0';
	int status_reg=(int)strtol(tmp_str,NULL,16);
	(status_reg & PORF)   ? strcpy(MemoryMap.strPORF,  "true") : strcpy(MemoryMap.strPORF,  "false");
	(status_reg & CHGTF)  ? strcpy(MemoryMap.strCHGTF, "true") : strcpy(MemoryMap.strCHGTF, "false");
	(status_reg & AEF)    ? strcpy(MemoryMap.strAEF,   "true") : strcpy(MemoryMap.strAEF,   "false");
	(status_reg & SEF)    ? strcpy(MemoryMap.strSEF,   "true") : strcpy(MemoryMap.strSEF,   "false");	
	(status_reg & LEARNF) ? strcpy(MemoryMap.strLEARNF,"true") : strcpy(MemoryMap.strLEARNF,"false");
	(status_reg & UVF)    ? strcpy(MemoryMap.strUVF,   "true") : strcpy(MemoryMap.strUVF,   "false");
	// Status Register
	strncpy(tmp_str,Dumpreg.Range0x60 + (VAE_ADDRESS * ADDRESS_OFFSET),2);
	tmp_str[2]='\0';
	MemoryMap.vae=strtol(tmp_str,NULL,16) * 19.5;
	
	return true;
}
static bool write_register(unsigned short reg, unsigned short value) {
	if (!InitBatteryDir()) {
		return false;
	}
	if (reg > 255) {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid Register %d\"}",reg);
		return false;
	}
	if (value > 255) {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid Value %d\"}",value);
		return false;
	}
	if (!InitBatteryDir()) {
		return false;
	}
	
	FILE * file = fopen(battery_setreg_file, "w");
	if (!file) {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Cannot open %s\"}",battery_setreg_file);
		return false;
	}
	
	if (!fprintf(file,"0x%02x%02x\n",reg,value)) {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Error writing %s\"}",battery_setreg_file);
		return false;
	};
	fclose(file);
	
	return true;
}

static bool fill_dumpreg() {
	if (!InitBatteryDir()) {
		return false;
	}
	FILE * file = fopen(battery_dumpreg_file, "r");
	if (!file) {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Cannot open %s\"}",
				battery_dumpreg_file);
		return false;
	}
	if (!fread((void *)&Dumpreg,1,sizeof(Dumpreg),file)) {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Error reading %s\"}",
				battery_dumpreg_file);
		return false;
	};
	fclose(file);
	
	return true;
}

bool read_battery(){
	if (!fill_dumpreg()) return false;
	if (!fill_memory_map()) return false;
	return true;
}

bool ReadBatteryShort_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
	LSError lserror;
	LSErrorInit(&lserror);
	
	if (!read_battery()) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	}
	
	//return read_file(lshandle, message, filename, false);
	sprintf(read_file_buffer,
			"{\"returnValue\":true,\"errorCode\":0,\"getavgcurrent\":\"%ld\",\"getcoulomb\":\"%f\",\"getcurrent\":\"%ld\",\"getpercent\":\"%d\",\"gettemp\":\"%d\",\"getvoltage\":\"%ld\",\"PORF\":%s,\"UVF\":%s,\"LEARNF\":%s,\"SEF\":%s,\"AEF\":%s,\"CHGTF\":%s,\"VAE\":%f}",
			MemoryMap.avgcurrent,
			MemoryMap.coulomb,
			MemoryMap.current,
			MemoryMap.percent,
			MemoryMap.temp,
			MemoryMap.voltage,
			MemoryMap.strPORF,
			MemoryMap.strUVF,
			MemoryMap.strLEARNF,
			MemoryMap.strSEF,
			MemoryMap.strAEF,
			MemoryMap.strCHGTF,
			MemoryMap.vae
	);
	if (!LSMessageReply(lshandle, message, read_file_buffer , &lserror)) goto error;
	return true;
error:
	LSErrorPrint(&lserror, stderr);
	LSErrorFree(&lserror);
end:
	return false;
}

bool ReadBatteryHealth_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
	LSError lserror;
	LSErrorInit(&lserror);
	
	if (!read_battery()) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	}
	
	sprintf(read_file_buffer,
			"{\"returnValue\": true, \"errorCode\": 0, \"getfull40\":\"%f\", \"getage\":\"%f\", \"getcapacity\":\"%f\"}",
			MemoryMap.full40,MemoryMap.age,MemoryMap.full40*MemoryMap.age/100);
	if (!LSMessageReply(lshandle, message, read_file_buffer , &lserror)) goto error;
	return true;
error:
	LSErrorPrint(&lserror, stderr);
	LSErrorFree(&lserror);
end:
	return false;
}

bool SetBatteryAGE_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
	LSError lserror;
	LSErrorInit(&lserror);

	json_t *object = LSMessageGetPayloadJSON(message);
	json_t *percentage = json_find_first_label(object, "percentage");               
	if (!percentage || (percentage->child->type != JSON_NUMBER) ) {
		if (!LSMessageReply(lshandle, message,
							"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid or missing percentage\"}",
							&lserror)) goto error;
		return true;
	}

	if (!read_battery()) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	}

	int iAge = (int)strtol(percentage->child->text,NULL,10);
	//int iAge = (int)percentage->child->text;

	if ((iAge < 50) || (iAge > 100)) {
		sprintf(error_file_buffer,"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid percentage %d\"}",iAge);
		if (!LSMessageReply(lshandle, message,
							error_file_buffer,
							&lserror)) goto error;
		return true;
	}
	if (!write_register(AGE_REGISTER,(int)((iAge * 128 / 100.)+.5f))) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	} else {
		sprintf(read_file_buffer,
				"{\"returnValue\": true, \"errorCode\": 0}");
		if (!LSMessageReply(lshandle, message, read_file_buffer , &lserror)) goto error;
		return true;
	}
	return true;
error:
	LSErrorPrint(&lserror, stderr);
	LSErrorFree(&lserror);
end:
	return false;
}

bool ResetBatteryStatusRegister_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
	LSError lserror;
	LSErrorInit(&lserror);
		
	if (!read_battery()) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	}
	
	if (!write_register(STATUS_REGISTER,0)) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	} else {
		sprintf(read_file_buffer,
				"{\"returnValue\": true, \"errorCode\": 0}");
		if (!LSMessageReply(lshandle, message, read_file_buffer , &lserror)) goto error;
		return true;
	}
	return true;
error:
	LSErrorPrint(&lserror, stderr);
	LSErrorFree(&lserror);
end:
	return false;
}

bool SetBatteryFULL40_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
	LSError lserror;
	LSErrorInit(&lserror);
	
	json_t *object = LSMessageGetPayloadJSON(message);
	json_t *capacity = json_find_first_label(object, "capacity");               
	if (!capacity || (capacity->child->type != JSON_NUMBER) ) {
		if (!LSMessageReply(lshandle, message,
							"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid or missing capacity\"}",
							&lserror)) goto error;
		return true;
	}
	int iCapacity = (int)strtol(capacity->child->text,NULL,10);
	//int iAge = (int)percentage->child->text;
	
	if (!read_battery()) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	}

	if ((iCapacity < 500) || (iCapacity > 5000)) {
		sprintf(error_file_buffer,"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid capacity %d\"}",iCapacity);
		if (!LSMessageReply(lshandle, message,
							error_file_buffer,
							&lserror)) goto error;
		return true;
	}
	iCapacity = (int)((long)iCapacity * (long)MemoryMap.rsense * 4000L / 25000L);
	int iLSB = iCapacity & 0xFF;
	int iMSB = (iCapacity >> 8) & 0xFF;

	if (!write_register(Full40LSB_REGISTER,iLSB)) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	}
	if (!write_register(Full40MSB_REGISTER,iMSB)) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	} else {
		sprintf(read_file_buffer,
				"{\"returnValue\": true, \"errorCode\": 0}");
		if (!LSMessageReply(lshandle, message, read_file_buffer , &lserror)) goto error;
	}
	return true;
error:
	LSErrorPrint(&lserror, stderr);
	LSErrorFree(&lserror);
end:
	return false;
}

bool SetBatteryRegister_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
	LSError lserror;
	LSErrorInit(&lserror);
	
	json_t *object = LSMessageGetPayloadJSON(message);
	json_t *name = json_find_first_label(object, "name");               
	if (!name || (name->child->type != JSON_STRING) || (strspn(name->child->text, ALLOWED_CHARS) != strlen(name->child->text))) {
		if (!LSMessageReply(lshandle, message,
					"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid or missing name\"}",
					&lserror)) goto error;
		return true;
	}
	json_t *value = json_find_first_label(object, "value");               
	if (!value || (value->child->type != JSON_NUMBER) ) {
		if (!LSMessageReply(lshandle, message,
					"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid or missing value\"}",
					&lserror)) goto error;
		return true;
	}
	if (!read_battery()) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
		return true;
	}
	if (strcmp(value->child->text,"VAE")){
		int iValue = (int)strtol(value->child->text,NULL,10);
		//int iAge = (int)percentage->child->text;
		
		if (iValue < 3393) {
			sprintf(error_file_buffer,"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid VAE Value %d\"}",iValue);
			if (!LSMessageReply(lshandle, message,
								error_file_buffer,
								&lserror)) goto error;
			return true;
		}
		if (!write_register(VAE_REGISTER,(int)(iValue / 19.5))) {
			if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
			return true;
		} else {
			sprintf(error_file_buffer,
					"{\"returnValue\": true, \"errorCode\": 0}");
			if (!LSMessageReply(lshandle, message, error_file_buffer , &lserror)) goto error;
			return true;
		}
	} else {
		sprintf(error_file_buffer,
				"{\"returnValue\": false, \"errorCode\": -1, \"errorText\": \"Invalid register %d\"}");
		if (!LSMessageReply(lshandle, message, error_file_buffer , &lserror)) goto error;
		return true;
	}
error:
	LSErrorPrint(&lserror, stderr);
	LSErrorFree(&lserror);
end:
	return false;
}

bool BatteryTest_method(LSHandle* lshandle, LSMessage *message, void *ctx) {
	LSError lserror;
	LSErrorInit(&lserror);
	
	if (!read_battery()) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
	}
	if (!write_register(-2,300)) {
		if (!LSMessageReply(lshandle, message, error_file_buffer,&lserror)) goto error;
	} else {
		sprintf(read_file_buffer,
			"{\"returnValue\": true, \"errorCode\": 0, \"write returned\":\"%s\"}",
			"true");
		LSMessageReply(lshandle, message, read_file_buffer , &lserror);
	}
	return true;
error:
	LSErrorPrint(&lserror, stderr);
	LSErrorFree(&lserror);
end:
	return false;
}

LSMethod luna_methods[] = {
  { "status",	dummy_method },
  { "version",	version_method },
  { "ReadBatteryHealth",	ReadBatteryHealth_method },
  { "ReadBatteryShort",	ReadBatteryShort_method },
  { "BatteryTest",	BatteryTest_method },
  { "SetBatteryAGE",	SetBatteryAGE_method },
  { "SetBatteryRegister",	SetBatteryRegister_method },
  { "SetBatteryFULL40",	SetBatteryFULL40_method },
  { "ResetBatteryStatusRegister",	ResetBatteryStatusRegister_method },
  { 0, 0 }
};

bool register_methods(LSPalmService *serviceHandle, LSError lserror) {
  return LSPalmServiceRegisterCategory(serviceHandle, "/", luna_methods,
				       NULL, NULL, NULL, &lserror);
}
