import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from MyConfig import MyConfig as cfg


def sendEmail(subject, body, to_user, from_user_name='SimpleVisor Support', from_user = cfg.email, pwd=cfg.email_password):
  to_user_list = to_user.split(",")
  smtpserver = smtplib.SMTP("smtp.gmail.com", 587)
  smtpserver.starttls()
  smtpserver.login(from_user, pwd)
  print("Sending email to {}".format(to_user))
  msg = MIMEMultipart()
  msg['From'] = f'{from_user_name} <{from_user}>'
  msg['Subject'] = subject
  to_string = ','.join(to_user_list)
  msg['To'] = to_string
  email_content = body
  msg.attach(MIMEText(email_content, 'html'))
  smtpserver.sendmail(from_user, to_user_list, msg.as_string())
  smtpserver.close()
