"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import styles from "@/styles/login-register.module.css";

interface FormFieldProps {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { set: setToken } = useLocalStorage<string>("token", "", { storage: "session" });
  const { set: setUserId } = useLocalStorage<string>("userId", "", { storage: "session" });
  const { set: setUsername } = useLocalStorage<string>("username", "", { storage: "session" });

  const handleLogin = async (values: FormFieldProps) => {
    setIsSubmitting(true);
    try {
      const response = await apiService.post<User>("/login", values);

      if (response.token) setToken(response.token);
      if (response.id) setUserId(String(response.id));
      if (response.username) setUsername(response.username);
      router.replace("/lobby");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the login:\n${error.message}`);
      } else {
        console.error("Unknown error during login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles["login-register-container"]}>
      <div className={styles.card}>
        <h1>Settlers of Catan</h1>
        <p>Welcome back!</p>

        <Form
          form={form}
          name="login"
          layout="vertical"
          onFinish={handleLogin}
        >
          {/* Username */}
          <Form.Item
            label="Username"
            name="username"
            className={styles["form-item"]}
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input
              className={styles["login-register-input"]}
              prefix={<UserOutlined className={styles["input-icon"]} />}
              placeholder="Enter your username"
            />
          </Form.Item>

          {/* Password */}
          <Form.Item
            label="Password"
            name="password"
            className={styles["form-item"]}
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password
              className={styles["login-register-input"]}
              prefix={<LockOutlined className={styles["input-icon"]} />}
              placeholder="Enter your password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              htmlType="submit"
              className={styles["login-register-button"]}
              loading={isSubmitting}
            >
              Login
            </Button>
          </Form.Item>
        </Form>
        
        {/* Sign Up Text */}
        <p className={styles["sign-up-login-text"]}>
          Don&apos;t have an account yet?{" "}
          <span
            className={styles["sign-up-login-link"]}
            onClick={() => router.push("/register")}
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
