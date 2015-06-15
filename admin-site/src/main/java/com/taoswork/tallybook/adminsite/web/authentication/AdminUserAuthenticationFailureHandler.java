package com.taoswork.tallybook.adminsite.web.authentication;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Created by Gao Yuan on 2015/4/23.
 */
public class AdminUserAuthenticationFailureHandler
        extends SimpleUrlAuthenticationFailureHandler {

        public AdminUserAuthenticationFailureHandler(){

        }
        @Override
        public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
                super.onAuthenticationFailure(request, response, exception);
        }
}
