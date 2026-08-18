import smtplib

EMAIL_ADDRESS = "olatunbosunpay191@gmail.com"
EMAIL_PASSWORD = "lvld bcin mpwv vpec"

try:
    server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
    print("Login successful!")
    server.quit()

except Exception as e:
    import traceback
    traceback.print_exc()
    print("Email Error:", repr(e))
    return False