from Cookie import SimpleCookie
import time
import base64
import os
from utils import md5, ucfirst
from datetime import datetime, timedelta

sessions = {}

class Session:
	def __init__(self, key):
		self.key = key
		self.map = {}
		#TODO Remove
		# self.map.user = User.load(username = 'mmrozek')

	def keys(self):
		return self.map.keys()

	def values(self):
		return self.map.values()

	def __getitem__(self, k):
		return self.map[k] if k in self.map else None

	def __setitem__(self, k, v):
		self.map[k] = v

	def __delitem__(self, k):
		del self.map[k]

	def __iter__(self):
		return self.map.__iter__()

	@staticmethod
	def determineKey(handler):
		hdr = handler.headers.getheader('Cookie')
		if not hdr: return Session.generateKey()
		c = SimpleCookie()
		c.load(hdr)
		return c['session'].value if c.has_key('session') else Session.generateKey()

	@staticmethod
	def generateKey():
		key = md5(os.urandom(128) + str(time.time()))[:-3].replace('/', '$')
		if key in sessions:
			return None
		return key

	@staticmethod
	def load(key):
		if key not in sessions:
			sessions[key] = Session(key)
		return sessions[key]

def timestamp(days = 7):
	return (datetime.utcnow() + timedelta(days)).strftime("%a, %d-%b-%Y %H:%M:%S GMT")

def delay(handler, item):
	if 'delayed' not in handler.session:
		handler.session['delayed'] = []
	handler.session['delayed'].append(item)

def undelay(handler):
	if 'delayed' in handler.session:
		for item in handler.session['delayed']:
			print item
		del handler.session['delayed']