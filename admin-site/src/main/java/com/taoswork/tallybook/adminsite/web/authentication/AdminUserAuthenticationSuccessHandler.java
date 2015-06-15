package com.taoswork.tallybook.adminsite.web.authentication;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Created by Gao Yuan on 2015/4/23.
 */
public class AdminUserAuthenticationSuccessHandler
        extends SimpleUrlAuthenticationSuccessHandler {
        public AdminUserAuthenticationSuccessHandler(){
                this.setDefaultTargetUrl("/loginSuccess");
                this.setAlwaysUseDefaultTargetUrl(false);
        }
        @Override
        public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
                super.onAuthenticationSuccess(request, response, authentication);
        }
}
