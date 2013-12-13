import socket

from Settings import PORT
from utils import *

from rorn.HTTPServer import HTTPServer as ParentServer
from rorn.Lock import getLock, getCounter

class ServerError(Exception): pass

class HTTPServer(ParentServer):
	def __init__(self, *args, **kw):
		super(HTTPServer, self).__init__(*args, **kw)
		self.totalRequests = 0
		self.currentRequests = getCounter('requests', unique = True)

	def process_request(self, request, client_address):
		# The #reqcheck lock is used by some threads to block requests
		# Grab it to make sure none of those threads have it, and then add this request
		# to 'currentRequests' to prevent those threads from starting
		with getLock('#reqcheck'):
			self.totalRequests += 1
			self.currentRequests.inc()
		return super(HTTPServer, self).process_request(request, client_address)

	# When this returns, there will be no more than 'expected' processing requests and
	# it will have acquired #reqcheck to keep it that way (it also returns the lock instance)
	# The caller *needs* to release #reqcheck when finished
	def block_requests(self, expected = 0):
		from Log import console
		lock = getLock('#reqcheck')
		while True:
			lock.acquire()
			if self.currentRequests.count <= expected:
				return lock
			lock.release()
			threadYield()

	def close_request(self, request):
		self.currentRequests.dec()
		super(HTTPServer, self).close_request(request)

	def getTotalRequests(self):
		return self.totalRequests

	def anyCurrentRequests(self):
		return self.currentRequests.any()

singleton = None
def server():
	global singleton
	if not singleton:
		try:
			from HTTPHandler import HTTPHandler
			singleton = HTTPServer(('', PORT), HTTPHandler)
		except socket.error, (errno, msg):
			raise ServerError("Unable to open port %d: %s" % (PORT, msg))
	return singleton
