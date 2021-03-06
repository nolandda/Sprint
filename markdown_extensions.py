from markdown import Extension
from markdown.inlinepatterns import Pattern
from markdown.util import etree, AtomicString

from User import User

class SVNPattern(Pattern):
	def handleMatch(self, m):
		revisionID = int(m.group(3))
		link = etree.Element('a')
		link.set('href', "/svn/%d" % revisionID)
		link.text = m.group(2)
		return link
svnPattern = SVNPattern('(r([0-9]+))')

class SVNExtension(Extension):
	def extendMarkdown(self, md, md_globals):
		md.registerExtension(self)
		md.inlinePatterns.add('svn', svnPattern, '_end')

class BugzillaPattern(Pattern):
	def handleMatch(self, m):
		from Settings import settings
		url = settings.bugzillaURL
		if url == '':
			return None

		bugID = int(m.group(3))
		link = etree.Element('a')
		link.set('href', "%s/show_bug.cgi?id=%d" % (url, bugID))
		link.text = m.group(2)
		return link
bugzillaPattern = BugzillaPattern('((?:bz|bug )([0-9]+))')

class BugzillaExtension(Extension):
	def extendMarkdown(self, md, md_global):
		md.registerExtension(self)
		md.inlinePatterns.add('bugzilla', bugzillaPattern, '_end')

class UserPattern(Pattern):
	def handleMatch(self, m):
		username = m.group(2)
		user = User.load(username = username)
		if not user:
			return None

		link = etree.Element('a')
		link.set('href', "/users/%s" % username)

		avatar = etree.Element('img')
		link.append(avatar)
		avatar.set('src', user.getAvatar(16))
		avatar.set('class', 'bumpdown')
		avatar.text = AtomicString(' ' + username)

		return link
userPattern = UserPattern('\\b([a-z]+)\\b')

class UserExtension(Extension):
	def extendMarkdown(self, md, md_global):
		md.registerExtension(self)
		md.inlinePatterns.add('user', userPattern, '_end')

class StrikethroughPattern(Pattern):
	def handleMatch(self, m):
		text = m.group(2)
		s = etree.Element('s')
		s.text = text
		return s
strikethroughPattern = StrikethroughPattern('---([^ ].*?)---')

class StrikethroughExtension(Extension):
	def extendMarkdown(self, md, md_global):
		md.registerExtension(self)
		md.inlinePatterns.add('strikethrough', strikethroughPattern, '_end')
